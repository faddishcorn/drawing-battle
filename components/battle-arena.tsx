'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Swords, Trophy, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { db, storage } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  startAt,
} from 'firebase/firestore'
import type { Character, BattleState, BattleResult } from '@/lib/types'
import { requestBattle } from '@/lib/api/battle'
import { getDownloadURL, ref } from 'firebase/storage'

// Download URL cache (memory + localStorage) and image preloader
const downloadUrlMemoryCache = new Map<string, string>()

function getDownloadUrlCacheKey(path: string) {
  return `dlurl:${path}`
}

async function getCachedDownloadUrl(path: string): Promise<string> {
  // 1) Memory cache
  const mem = downloadUrlMemoryCache.get(path)
  if (mem) return mem

  // 2) localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem(getDownloadUrlCacheKey(path))
      if (cached) {
        downloadUrlMemoryCache.set(path, cached)
        return cached
      }
    } catch {
      // ignore
    }
  }

  // 3) Fetch from Storage
  const url = await getDownloadURL(ref(storage, path))
  downloadUrlMemoryCache.set(path, url)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getDownloadUrlCacheKey(path), url)
    } catch {
      // ignore
    }
  }
  return url
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.decoding = 'async'
      // @ts-ignore: fetchPriority may not be typed in some TS DOM versions
      img.fetchPriority = 'high'
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = url
      // Try decode when available
      // @ts-ignore
      if (typeof img.decode === 'function') {
        // @ts-ignore
        img.decode().then(() => resolve()).catch(() => resolve())
      }
    } catch {
      resolve()
    }
  })
}

interface BattleArenaProps {
  myCharacter: Character
  userId: string
}

export function BattleArena({ myCharacter, userId }: BattleArenaProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [battleState, setBattleState] = useState<BattleState>('ready')
  const [result, setResult] = useState<BattleResult | null>(null)
  const [reasoning, setReasoning] = useState<string>('')
  const [pointsChange, setPointsChange] = useState<number>(0)
  const [opponent, setOpponent] = useState<Character | null>(null)
  const [newRank, setNewRank] = useState<number>(myCharacter.rank)
  const [finalPlayer, setFinalPlayer] = useState<Partial<Character> | null>(null)
  const [finalOpponent, setFinalOpponent] = useState<Partial<Character> | null>(null)
  const [myImageSrc, setMyImageSrc] = useState<string>(myCharacter.imageUrl)
  const [opponentImageSrc, setOpponentImageSrc] = useState<string>('')
  const [cooldownMs, setCooldownMs] = useState<number>(0)
  const [lastOpponentIdDoc, setLastOpponentIdDoc] = useState<string | null>(null)
  const COOLDOWN_MS = 15_000

  // Prevent immediate rematch: keep the last matched opponent per character in localStorage
  const RECENT_KEY = `recentOpp:${myCharacter.id}`
  const getLastOpponentId = (): string | null => {
    if (typeof window === 'undefined') return null
    try {
      const v = window.localStorage.getItem(RECENT_KEY)
      return v || null
    } catch {
      return null
    }
  }
  const setLastOpponentId = (id: string) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(RECENT_KEY, id)
    } catch {}
  }

  // Keep a small recent-opponent ring buffer locally to avoid 반복 매칭 (client-side only)
  const RECENT_LIST_KEY = `recentOppList:${myCharacter.id}`
  const getRecentOpponents = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const v = window.localStorage.getItem(RECENT_LIST_KEY)
      const arr = v ? (JSON.parse(v) as unknown) : []
      return Array.isArray(arr) ? (arr.filter((x) => typeof x === 'string') as string[]) : []
    } catch {
      return []
    }
  }
  const pushRecentOpponent = (id: string) => {
    if (typeof window === 'undefined') return
    try {
      const current = getRecentOpponents()
      const next = [id, ...current.filter((x) => x !== id)].slice(0, 5) // keep last 5 unique
      window.localStorage.setItem(RECENT_LIST_KEY, JSON.stringify(next))
    } catch {}
  }

  // Resolve my character image URL for rendering
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        if (myCharacter.imageUrl.startsWith('data:')) {
          if (mounted) setMyImageSrc(myCharacter.imageUrl)
          return
        }
        if (
          myCharacter.imageUrl.startsWith('http://') ||
          myCharacter.imageUrl.startsWith('https://')
        ) {
          if (mounted) setMyImageSrc(myCharacter.imageUrl)
          return
        }
        const url = await getCachedDownloadUrl(myCharacter.imageUrl)
        if (mounted) setMyImageSrc(url)
      } catch (e) {
        console.warn('Failed to load my character image URL', e)
        if (mounted) setMyImageSrc('')
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
        const refDoc = await getDoc(doc(db, 'characters', myCharacter.id))
        if (!mounted) return
        const data = refDoc.data() as Character | undefined
        const last = data?.lastBattleAt as Timestamp | undefined
        if (data?.lastOpponentId) {
          setLastOpponentIdDoc(data.lastOpponentId)
        }
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
  }, [myCharacter.id])

  async function guardCooldown() {
    try {
      const refDoc = await getDoc(doc(db, 'characters', myCharacter.id))
      const data = refDoc.data() as Character | undefined
      const last = data?.lastBattleAt as Timestamp | undefined
      if (last) {
        const remain = last.toMillis() + COOLDOWN_MS - Date.now()
        if (remain > 0) {
          setCooldownMs(remain)
          throw new Error(`쿨다운 중입니다. ${Math.ceil(remain / 1000)}초 후 다시 시도하세요.`)
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('쿨다운 중')) {
        throw e
      }
      // if we fail to read, continue; fallback guard will be after result write
    }
  }

  async function pickOpponentFairly(): Promise<Character> {
    let picked: Character | null = null
    const r = Math.random()
    // Slightly broader pools to improve diversity
    const tryQueries = [
      query(collection(db, 'characters'), orderBy('rand'), startAt(r), limit(60)),
      query(collection(db, 'characters'), orderBy('rand'), limit(60)),
      query(collection(db, 'characters'), orderBy('rank', 'desc'), limit(80)),
    ]

    const lastId = getLastOpponentId()
    const recentList = getRecentOpponents()
    const excluded = new Set<string>([
      myCharacter.id,
      ...(lastId ? [lastId] : []),
      ...(lastOpponentIdDoc ? [lastOpponentIdDoc] : []),
      ...recentList,
    ])
    for (const q of tryQueries) {
      const snap = await getDocs(q)
      const poolAll = snap.docs.map((d) => d.data() as Character)
      const filtered = poolAll.filter((c) => c.userId !== userId && !excluded.has(c.id))
      // If exclusion removes everything, fall back to the unfiltered pool to avoid dead-ends
      const finalPool = filtered.length > 0 ? filtered : poolAll
      if (finalPool.length > 0) {
        // Fair pick: prefer opponents with older lastBattleAt, with slight random jitter
        const now = Date.now()
        const sampleK = Math.min(12, finalPool.length)
        const takeRandomIndex = (max: number) => {
          if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
            const buf = new Uint32Array(1)
            crypto.getRandomValues(buf)
            return Number(buf[0] % max)
          }
          return Math.floor(Math.random() * max)
        }
        const sampled: Character[] = []
        const used = new Set<number>()
        while (sampled.length < sampleK) {
          const idx = takeRandomIndex(finalPool.length)
          if (!used.has(idx)) {
            used.add(idx)
            sampled.push(finalPool[idx])
          }
        }
        let best: { c: Character; score: number } | null = null
        for (const c of sampled) {
          const t: any = (c as any).lastBattleAt
          const ts = t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : 0
          const staleness = ts ? Math.max(0, now - ts) : Number.MAX_SAFE_INTEGER / 4
          const jitter = takeRandomIndex(1000)
          const score = staleness + jitter
          if (!best || score > best.score) best = { c, score }
        }
        picked = best ? best.c : finalPool[takeRandomIndex(finalPool.length)]
        break
      }
    }
    if (!picked)
      throw new Error('상대가 없습니다. 다른 사용자가 캐릭터를 만들 때까지 기다려주세요.')
    setLastOpponentId(picked.id)
    pushRecentOpponent(picked.id)
    return picked
  }

  async function resolveImageUrlForAI(raw: string): Promise<string | undefined> {
    if (!raw) return undefined
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    try {
      const url = await getCachedDownloadUrl(raw)
      return url
    } catch {
      return undefined
    }
  }

  const startBattle = async () => {
    // Guard by cooldown before doing anything heavy
    try {
      await guardCooldown()
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('쿨다운 중')) {
        toast({ title: '대기 시간', description: e.message, variant: 'default' })
        return
      }
    }

    setBattleState('matching')

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))

      // 1) Pick opponent fairly (rank-agnostic)
      const picked = await pickOpponentFairly()
      setOpponent(picked)

      setBattleState('battling')

      // Resolve opponent image URL for AI and UI rendering (prepare in advance)
      const opponentUrlPromise = resolveImageUrlForAI(picked.imageUrl)
      // Prefer already-resolved public URL for my character as well
      const playerImageForAI =
        myImageSrc && (myImageSrc.startsWith('http://') || myImageSrc.startsWith('https://'))
          ? myImageSrc
          : undefined

      const opponentImageForAI = await opponentUrlPromise
      setOpponentImageSrc(opponentImageForAI || '')
      if (opponentImageForAI) {
        // Preload opponent image to minimize first paint delay
        void preloadImage(opponentImageForAI)
      }

      // 2) Ask server for judgement only (send image URLs, ranks are ignored by server)
      const data = await requestBattle({
        player: { id: myCharacter.id, imageUrl: playerImageForAI },
        opponent: { id: picked.id, imageUrl: opponentImageForAI || undefined },
      })
      const battleResult = data.result as BattleResult
      const delta = Number(data.pointsChange) || 0

      // 3) Update both characters in Firestore
      const playerRef = doc(db, 'characters', myCharacter.id)

      const playerSnap = await getDoc(playerRef)
      const oppSnap = await getDoc(doc(db, 'characters', picked.id))
      if (!playerSnap.exists() || !oppSnap.exists())
        throw new Error('캐릭터 문서를 찾을 수 없습니다')

      const player = playerSnap.data() as Character
      const opp = oppSnap.data() as Character

      const playerNewRank = Math.max(1, player.rank + delta)
      const oppNewRank = Math.max(1, opp.rank - delta)

      // Use server-computed stats when available to avoid interim inconsistencies
      const apiPlayer = data?.updatedPlayer as Partial<Character> | undefined
      const apiOpponent = data?.updatedOpponent as Partial<Character> | undefined
      const newPlayerStats = {
        rank: playerNewRank,
        wins: player.wins + (battleResult === 'win' ? 1 : 0),
        losses: player.losses + (battleResult === 'loss' ? 1 : 0),
        draws: player.draws + (battleResult === 'draw' ? 1 : 0),
        totalBattles: player.totalBattles + 1,
        winRate:
          ((player.wins + (battleResult === 'win' ? 1 : 0)) / (player.totalBattles + 1)) * 100,
        updatedAt: serverTimestamp(),
        lastBattleAt: serverTimestamp(),
        ...(apiPlayer ?? {}),
      } as Partial<Character>
      const newOppStats = {
        rank: oppNewRank,
        wins: opp.wins + (battleResult === 'loss' ? 1 : 0),
        losses: opp.losses + (battleResult === 'win' ? 1 : 0),
        draws: opp.draws + (battleResult === 'draw' ? 1 : 0),
        totalBattles: opp.totalBattles + 1,
        winRate: ((opp.wins + (battleResult === 'loss' ? 1 : 0)) / (opp.totalBattles + 1)) * 100,
        updatedAt: serverTimestamp(),
        ...(apiOpponent ?? {}),
      } as Partial<Character>

      // If server already persisted both, skip client writes
      if (!data?.persisted) {
        await updateDoc(playerRef, { ...newPlayerStats, lastOpponentId: picked.id, rand: Math.random() })
      } else {
        // Even if server persisted stats, refresh local 'rand' to keep matchmaking distribution fresh
        try {
          await updateDoc(playerRef, { rand: Math.random(), lastOpponentId: picked.id })
        } catch {}
      }

      // 4) Save battle record
      if (!data?.persisted) {
        const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await setDoc(doc(db, 'battles', battleId), {
          id: battleId,
          characterId: myCharacter.id,
          opponentId: picked.id,
          result: battleResult,
          reasoning: data.reasoning,
          pointsChange: delta,
          characterRankBefore: player.rank,
          characterRankAfter: newPlayerStats.rank,
          opponentRankBefore: opp.rank,
          opponentRankAfter: newOppStats.rank,
          createdAt: new Date(),
        })
      }

      setResult(battleResult)
      setReasoning(data.reasoning)
      setPointsChange(delta)
      setNewRank((newPlayerStats.rank ?? playerNewRank) as number)
      setFinalPlayer({ ...player, ...newPlayerStats })
      setFinalOpponent({ ...picked, ...newOppStats })
      setOpponent({
        ...picked,
        rank: (newOppStats.rank ?? oppNewRank) as number,
        wins: (newOppStats.wins ?? opp.wins) as number,
        losses: (newOppStats.losses ?? opp.losses) as number,
        draws: (newOppStats.draws ?? opp.draws) as number,
        totalBattles: (newOppStats.totalBattles ?? opp.totalBattles) as number,
        winRate: (newOppStats.winRate ?? opp.winRate) as number,
      })
      setLastOpponentIdDoc(picked.id)
      // Start local cooldown timer right away
      setCooldownMs(COOLDOWN_MS)
      const start = Date.now()
      const tick = setInterval(() => {
        const left = Math.max(0, COOLDOWN_MS - (Date.now() - start))
        setCooldownMs(left)
        if (left <= 0) clearInterval(tick)
      }, 250)

      setBattleState('finished')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Battle failed',
        variant: 'destructive',
      })
      setBattleState('ready')
    }
  }

  const handleContinue = () => {
    router.push('/gallery')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">배틀 아레나</h2>
        <p className="text-muted-foreground mt-1">
          {battleState === 'ready' && '배틀을 시작하세요!'}
          {battleState === 'matching' && '상대를 찾는 중...'}
          {battleState === 'battling' && 'AI가 배틀을 분석하는 중...'}
          {battleState === 'finished' && '배틀 결과'}
        </p>
      </div>

      {battleState === 'ready' && (
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{myCharacter.name}</CardTitle>
              <Badge variant="secondary" className="mx-auto gap-1">
                <Trophy className="h-3 w-3" />
                랭크 {myCharacter.rank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={myImageSrc || '/placeholder.svg'}
                  alt="My Character"
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
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
            <Button
              size="lg"
              onClick={startBattle}
              className="gap-2"
              disabled={cooldownMs > 0 || battleState !== 'ready'}
            >
              <Zap className="h-5 w-5" />
              {cooldownMs > 0 ? `쿨다운 ${Math.ceil(cooldownMs / 1000)}초` : '배틀 시작'}
            </Button>
          </div>
        </div>
      )}

      {battleState === 'matching' && (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="relative">
            <Swords className="h-20 w-20 text-primary animate-spin" />
          </div>
          <p className="text-lg font-semibold animate-pulse">상대를 찾는 중...</p>
        </div>
      )}

      {(battleState === 'battling' || battleState === 'finished') && opponent && (
        <div className="grid md:grid-cols-3 gap-6 items-center">
          {/* My Character */}
          <Card
            className={cn(
              'transition-all',
              battleState === 'finished' && result === 'win' && 'ring-2 ring-green-500',
            )}
          >
            <CardHeader>
              <CardTitle className="text-center">{myCharacter.name}</CardTitle>
              <Badge variant="secondary" className="mx-auto gap-1">
                <Trophy className="h-3 w-3" />
                랭크 {newRank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={myImageSrc || '/placeholder.svg'}
                  alt="My Character"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-4 text-center text-sm">
                <div className="text-muted-foreground">전적</div>
                <div className="font-semibold">
                  {battleState === 'finished' && finalPlayer
                    ? `${finalPlayer.wins}승 ${finalPlayer.losses}패 ${finalPlayer.draws}무`
                    : `${myCharacter.wins}승 ${myCharacter.losses}패 ${myCharacter.draws}무`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Battle Status */}
          <div className="flex flex-col items-center justify-center gap-4">
            {battleState === 'battling' && (
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
            {battleState === 'finished' && result && (
              <div className="text-center space-y-4">
                <div
                  className={cn(
                    'text-6xl font-bold',
                    result === 'win' && 'text-green-600',
                    result === 'loss' && 'text-red-600',
                    result === 'draw' && 'text-yellow-600',
                  )}
                >
                  {result === 'win' && '승리!'}
                  {result === 'loss' && '패배'}
                  {result === 'draw' && '무승부'}
                </div>
                <div
                  className={cn(
                    'text-2xl font-semibold',
                    pointsChange > 0 && 'text-green-600',
                    pointsChange < 0 && 'text-red-600',
                  )}
                >
                  {pointsChange > 0 && `+${pointsChange}`}
                  {pointsChange < 0 && pointsChange}
                  {pointsChange === 0 && '±0'} 포인트
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

          {/* Opponent Character - Show image only (hide rank, record, nickname) */}
          <Card
            className={cn(
              'transition-all',
              battleState === 'finished' && result === 'loss' && 'ring-2 ring-red-500',
            )}
          >
            <CardHeader>
              <CardTitle className="text-center">상대: {opponent.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={opponentImageSrc || '/placeholder.svg'}
                  alt="Opponent Character"
                  className="w-full h-full object-contain"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
