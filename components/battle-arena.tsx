"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Swords, Trophy, Zap, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { db, storage } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { getDownloadURL, ref } from "firebase/storage"

interface CharacterProps {
  id: string
  name: string
  userId: string
  imageUrl: string
  rank: number
  wins: number
  losses: number
  draws: number
  winRate: number
  totalBattles: number
  lastBattleAt?: Timestamp
}

interface BattleArenaProps {
  myCharacter: CharacterProps
  userId: string
}

type BattleState = "ready" | "matching" | "battling" | "finished"
type BattleResult = "win" | "loss" | "draw"

export function BattleArena({ myCharacter, userId }: BattleArenaProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [battleState, setBattleState] = useState<BattleState>("ready")
  const [result, setResult] = useState<BattleResult | null>(null)
  const [reasoning, setReasoning] = useState<string>("")
  const [pointsChange, setPointsChange] = useState<number>(0)
  const [opponent, setOpponent] = useState<CharacterProps | null>(null)
  const [newRank, setNewRank] = useState<number>(myCharacter.rank)
  const [myImageSrc, setMyImageSrc] = useState<string>(myCharacter.imageUrl)
  const [cooldownMs, setCooldownMs] = useState<number>(0)
  const COOLDOWN_MS = 15_000

  // Resolve my character image URL for rendering
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        if (myCharacter.imageUrl.startsWith("data:")) {
          if (mounted) setMyImageSrc(myCharacter.imageUrl)
          return
        }
        if (myCharacter.imageUrl.startsWith("http://") || myCharacter.imageUrl.startsWith("https://")) {
          if (mounted) setMyImageSrc(myCharacter.imageUrl)
          return
        }
        const url = await getDownloadURL(ref(storage, myCharacter.imageUrl))
        if (mounted) setMyImageSrc(url)
      } catch (e) {
        console.warn("Failed to load my character image URL", e)
        if (mounted) setMyImageSrc("")
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [myCharacter.imageUrl])

  // Load lastBattleAt and start countdown if within cooldown
  useEffect(() => {
    let timer: any
    let mounted = true
    const loadCooldown = async () => {
      try {
        const refDoc = await getDoc(doc(db, "characters", myCharacter.id))
        if (!mounted) return
        const data = refDoc.data() as CharacterProps | undefined
        const last = data?.lastBattleAt as Timestamp | undefined
        if (last) {
          const until = last.toMillis() + COOLDOWN_MS
          const now = Date.now()
          const remain = Math.max(0, until - now)
          setCooldownMs(remain)
          if (remain > 0) {
            timer = setInterval(() => {
              const left = Math.max(0, until - Date.now())
              setCooldownMs(left)
              if (left <= 0) {
                clearInterval(timer)
              }
            }, 250)
          }
        } else {
          setCooldownMs(0)
        }
      } catch {
        // ignore
      }
    }
    loadCooldown()
    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCharacter.id])

  const startBattle = async () => {
    // Guard by cooldown before doing anything heavy
    try {
      const refDoc = await getDoc(doc(db, "characters", myCharacter.id))
      const data = refDoc.data() as CharacterProps | undefined
      const last = data?.lastBattleAt as Timestamp | undefined
      if (last) {
        const remain = last.toMillis() + COOLDOWN_MS - Date.now()
        if (remain > 0) {
          setCooldownMs(remain)
          throw new Error(`쿨다운 중입니다. ${Math.ceil(remain / 1000)}초 후 다시 시도하세요.`)
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("쿨다운 중")) {
        toast({ title: "대기 시간", description: e.message, variant: "default" })
        return
      }
      // if we fail to read, continue; fallback guard will be after result write
    }

    setBattleState("matching")

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))

      // 1) Pick opponent client-side (top 50 by rank, then filter out my characters)
      const q = query(collection(db, "characters"), orderBy("rank", "desc"), limit(50))
      const snap = await getDocs(q)
      const others = snap.docs
        .map((d) => d.data() as CharacterProps)
        .filter((c) => c.userId !== userId && c.id !== myCharacter.id)

      if (others.length === 0) {
        throw new Error("상대가 없습니다. 다른 사용자가 캐릭터를 만들 때까지 기다려주세요.")
      }

      const picked = others[Math.floor(Math.random() * others.length)]
      setOpponent(picked)

      setBattleState("battling")

      // Resolve opponent image URL for AI (kept hidden in UI)
      let opponentImageForAI: string | undefined = undefined
      try {
        if (picked.imageUrl?.startsWith("http://") || picked.imageUrl?.startsWith("https://")) {
          opponentImageForAI = picked.imageUrl
        } else if (picked.imageUrl) {
          opponentImageForAI = await getDownloadURL(ref(storage, picked.imageUrl))
        }
      } catch (e) {
        console.warn("Failed to resolve opponent image URL for AI", e)
      }

      // Prefer the resolved public URL for my character as well
      const playerImageForAI = myImageSrc && (myImageSrc.startsWith("http://") || myImageSrc.startsWith("https://"))
        ? myImageSrc
        : undefined

      // 2) Ask server for judgement only (send image URLs, ranks are ignored by server)
      const response = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: { id: myCharacter.id, imageUrl: playerImageForAI },
          opponent: { id: picked.id, imageUrl: opponentImageForAI },
        }),
      })

      if (!response.ok) throw new Error("Battle failed")
      const data = await response.json()

      const battleResult = data.result as BattleResult
      const delta = Number(data.pointsChange) || 0

      // 3) Update both characters in Firestore
  const playerRef = doc(db, "characters", myCharacter.id)

      const playerSnap = await getDoc(playerRef)
  const oppSnap = await getDoc(doc(db, "characters", picked.id))
  if (!playerSnap.exists() || !oppSnap.exists()) throw new Error("캐릭터 문서를 찾을 수 없습니다")

      const player = playerSnap.data() as CharacterProps
      const opp = oppSnap.data() as CharacterProps

      const playerNewRank = Math.max(1, player.rank + delta)
      const oppNewRank = Math.max(1, opp.rank - delta)

      const newPlayerStats = {
        rank: playerNewRank,
        wins: player.wins + (battleResult === "win" ? 1 : 0),
        losses: player.losses + (battleResult === "loss" ? 1 : 0),
        draws: player.draws + (battleResult === "draw" ? 1 : 0),
        totalBattles: player.totalBattles + 1,
        winRate:
          ((player.wins + (battleResult === "win" ? 1 : 0)) / (player.totalBattles + 1)) * 100,
        updatedAt: serverTimestamp(),
        lastBattleAt: serverTimestamp(),
      }
      const newOppStats = {
        rank: oppNewRank,
        wins: opp.wins + (battleResult === "loss" ? 1 : 0),
        losses: opp.losses + (battleResult === "win" ? 1 : 0),
        draws: opp.draws + (battleResult === "draw" ? 1 : 0),
        totalBattles: opp.totalBattles + 1,
        winRate: ((opp.wins + (battleResult === "loss" ? 1 : 0)) / (opp.totalBattles + 1)) * 100,
        updatedAt: serverTimestamp(),
      }

  // Update only my character on client (opponent update requires server/admin)
  await updateDoc(playerRef, newPlayerStats)

      // 4) Save battle record
      const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await setDoc(doc(db, "battles", battleId), {
        id: battleId,
        characterId: myCharacter.id,
        opponentId: picked.id,
        result: battleResult,
        reasoning: data.reasoning,
        pointsChange: delta,
        characterRankBefore: player.rank,
        characterRankAfter: playerNewRank,
        opponentRankBefore: opp.rank,
        opponentRankAfter: oppNewRank,
        createdAt: new Date(),
      })

      setResult(battleResult)
      setReasoning(data.reasoning)
      setPointsChange(delta)
      setNewRank(playerNewRank)
  setOpponent({ ...picked, rank: oppNewRank, wins: newOppStats.wins, losses: newOppStats.losses, draws: newOppStats.draws, totalBattles: newOppStats.totalBattles, winRate: newOppStats.winRate })
      // Start local cooldown timer right away
      setCooldownMs(COOLDOWN_MS)
      const start = Date.now()
      const tick = setInterval(() => {
        const left = Math.max(0, COOLDOWN_MS - (Date.now() - start))
        setCooldownMs(left)
        if (left <= 0) clearInterval(tick)
      }, 250)

      setBattleState("finished")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Battle failed",
        variant: "destructive",
      })
      setBattleState("ready")
    }
  }

  const handleContinue = () => {
    router.push("/gallery")
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">배틀 아레나</h2>
        <p className="text-muted-foreground mt-1">
          {battleState === "ready" && "배틀을 시작하세요!"}
          {battleState === "matching" && "상대를 찾는 중..."}
          {battleState === "battling" && "AI가 배틀을 분석하는 중..."}
          {battleState === "finished" && "배틀 결과"}
        </p>
      </div>

      {battleState === "ready" && (
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">내 캐릭터</CardTitle>
              <Badge variant="secondary" className="mx-auto gap-1">
                <Trophy className="h-3 w-3" />
                랭크 {myCharacter.rank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <img src={myImageSrc || "/placeholder.svg"} alt="My Character" className="w-full h-full object-contain" />
              </div>
              <div className="mt-4 text-center text-sm">
                <div className="text-muted-foreground">전적</div>
                <div className="font-semibold">
                  {myCharacter.wins}승 {myCharacter.losses}패 {myCharacter.draws}무
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" onClick={startBattle} className="gap-2" disabled={cooldownMs > 0 || battleState !== "ready"}>
              <Zap className="h-5 w-5" />
              {cooldownMs > 0 ? `쿨다운 ${Math.ceil(cooldownMs/1000)}초` : "배틀 시작"}
            </Button>
          </div>
        </div>
      )}

      {battleState === "matching" && (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="relative">
            <Swords className="h-20 w-20 text-primary animate-spin" />
          </div>
          <p className="text-lg font-semibold animate-pulse">상대를 찾는 중...</p>
        </div>
      )}

      {(battleState === "battling" || battleState === "finished") && opponent && (
        <div className="grid md:grid-cols-3 gap-6 items-center">
          {/* My Character */}
          <Card
            className={cn("transition-all", battleState === "finished" && result === "win" && "ring-2 ring-green-500")}
          >
            <CardHeader>
              <CardTitle className="text-center">내 캐릭터</CardTitle>
              <Badge variant="secondary" className="mx-auto gap-1">
                <Trophy className="h-3 w-3" />
                랭크 {newRank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <img src={myImageSrc || "/placeholder.svg"} alt="My Character" className="w-full h-full object-contain" />
              </div>
              <div className="mt-4 text-center text-sm">
                <div className="text-muted-foreground">전적</div>
                <div className="font-semibold">
                  {result === "win"
                    ? `${myCharacter.wins + 1}승 ${myCharacter.losses}패 ${myCharacter.draws}무`
                    : result === "loss"
                      ? `${myCharacter.wins}승 ${myCharacter.losses + 1}패 ${myCharacter.draws}무`
                      : `${myCharacter.wins}승 ${myCharacter.losses}패 ${myCharacter.draws + 1}무`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Battle Status */}
          <div className="flex flex-col items-center justify-center gap-4">
            {battleState === "battling" && (
              <>
                <div className="relative">
                  <Swords className="h-16 w-16 text-primary animate-pulse" />
                  <div className="absolute inset-0 animate-ping">
                    <Swords className="h-16 w-16 text-primary opacity-75" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">배틀 진행 중...</p>
              </>
            )}
            {battleState === "finished" && result && (
              <div className="text-center space-y-4">
                <div
                  className={cn(
                    "text-6xl font-bold",
                    result === "win" && "text-green-600",
                    result === "loss" && "text-red-600",
                    result === "draw" && "text-yellow-600",
                  )}
                >
                  {result === "win" && "승리!"}
                  {result === "loss" && "패배"}
                  {result === "draw" && "무승부"}
                </div>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    pointsChange > 0 && "text-green-600",
                    pointsChange < 0 && "text-red-600",
                  )}
                >
                  {pointsChange > 0 && `+${pointsChange}`}
                  {pointsChange < 0 && pointsChange}
                  {pointsChange === 0 && "±0"} 포인트
                </div>
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <p className="text-sm text-center">{reasoning}</p>
                  </CardContent>
                </Card>
                <Button onClick={handleContinue} size="lg">
                  계속하기
                </Button>
              </div>
            )}
          </div>

          {/* Opponent Character - Hidden Image, but show name */}
          <Card
            className={cn("transition-all", battleState === "finished" && result === "loss" && "ring-2 ring-red-500")}
          >
            <CardHeader>
              <CardTitle className="text-center">상대: {opponent.name}</CardTitle>
              <Badge variant="secondary" className="mx-auto gap-1">
                <Trophy className="h-3 w-3" />
                랭크 {opponent.rank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center space-y-2">
                  <HelpCircle className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">???</p>
                  <p className="text-xs text-muted-foreground">상대는 비밀입니다</p>
                </div>
              </div>
              <div className="mt-4 text-center text-sm">
                <div className="text-muted-foreground">전적</div>
                <div className="font-semibold">
                  {opponent.wins}승 {opponent.losses}패 {opponent.draws}무
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
