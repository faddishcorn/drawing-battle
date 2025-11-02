"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

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
}

interface RankingsListProps {
  characters: CharacterProps[]
  showTopBadges?: boolean
}

export function RankingsList({ characters, showTopBadges = false }: RankingsListProps) {
  const { user } = useAuth()

  const getRankIcon = (index: number) => {
    if (!showTopBadges) return null

    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return null
    }
  }

  const getRankColor = (index: number) => {
    if (!showTopBadges) return ""

    switch (index) {
      case 0:
        return "bg-yellow-500/10 border-yellow-500/20"
      case 1:
        return "bg-gray-400/10 border-gray-400/20"
      case 2:
        return "bg-amber-600/10 border-amber-600/20"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-3">
      {characters.map((character, index) => {
        const isMyCharacter = character.userId === user?.id
        const winRate = character.totalBattles > 0 ? character.winRate.toFixed(1) : "0.0"

        return (
          <Card
            key={character.id}
            className={cn(
              "transition-all hover:shadow-md",
              getRankColor(index),
              isMyCharacter && "ring-2 ring-primary",
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Rank Number */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold text-lg">
                  {showTopBadges && index < 3 ? getRankIcon(index) : <span>#{index + 1}</span>}
                </div>

                {/* Character Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold truncate">{character.name}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="gap-1">
                      <Trophy className="h-3 w-3" />
                      {character.rank}
                    </Badge>
                    {isMyCharacter && <Badge variant="default">내 캐릭터</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">전적: </span>
                      <span className="font-semibold">
                        {character.wins}승 {character.losses}패 {character.draws}무
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">승률: </span>
                      <span className="font-semibold text-primary">{winRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Points Display */}
                <div className="text-right hidden sm:block">
                  <div className="text-2xl font-bold text-primary">{character.rank}</div>
                  <div className="text-xs text-muted-foreground">포인트</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
