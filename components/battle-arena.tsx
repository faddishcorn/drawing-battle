"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Swords, Trophy, Zap, HelpCircle } from "lucide-react"
import type { Character } from "@/lib/mock-data"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface BattleArenaProps {
  myCharacter: Character
}

type BattleState = "ready" | "matching" | "battling" | "finished"
type BattleResult = "win" | "loss" | "draw"

export function BattleArena({ myCharacter }: BattleArenaProps) {
  const router = useRouter()
  const [battleState, setBattleState] = useState<BattleState>("ready")
  const [result, setResult] = useState<BattleResult | null>(null)
  const [reasoning, setReasoning] = useState<string>("")
  const [pointsChange, setPointsChange] = useState<number>(0)
  const [opponent, setOpponent] = useState<Character | null>(null)

  const startBattle = async () => {
    setBattleState("matching")

    try {
      const matchResponse = await fetch("/api/battle/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myCharacter.userId }),
      })

      const { opponent: matchedOpponent } = await matchResponse.json()
      setOpponent(matchedOpponent)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      setBattleState("battling")

      // Simulate AI battle analysis
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const response = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          myCharacter: {
            id: myCharacter.id,
            rank: myCharacter.rank,
            imageData: myCharacter.imageData,
          },
          opponent: {
            id: matchedOpponent.id,
            rank: matchedOpponent.rank,
            imageData: matchedOpponent.imageData,
          },
        }),
      })

      const data = await response.json()
      setResult(data.result)
      setReasoning(data.reasoning)
      setPointsChange(data.pointsChange)
      setBattleState("finished")
    } catch (error) {
      console.error("Battle error:", error)
      // Fallback to random result if API fails
      const outcomes: BattleResult[] = ["win", "loss", "draw"]
      const randomResult = outcomes[Math.floor(Math.random() * outcomes.length)]
      setResult(randomResult)
      setReasoning("배틀이 치열하게 진행되었습니다!")
      setPointsChange(randomResult === "win" ? 25 : randomResult === "loss" ? -15 : 0)
      setBattleState("finished")
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
                <Image
                  src={myCharacter.imageData || "/placeholder.svg"}
                  alt="My Character"
                  fill
                  className="object-contain"
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
            <Button size="lg" onClick={startBattle} className="gap-2">
              <Zap className="h-5 w-5" />
              배틀 시작
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
                랭크 {myCharacter.rank}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                <Image
                  src={myCharacter.imageData || "/placeholder.svg"}
                  alt="My Character"
                  fill
                  className="object-contain"
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

          {/* Opponent Character - Hidden */}
          <Card
            className={cn("transition-all", battleState === "finished" && result === "loss" && "ring-2 ring-red-500")}
          >
            <CardHeader>
              <CardTitle className="text-center">상대 캐릭터</CardTitle>
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
