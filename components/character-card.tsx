"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Swords, Trophy, Trash2 } from "lucide-react"
import type { Character } from "@/lib/mock-data"
import Image from "next/image"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CharacterCardProps {
  character: Character
  onDelete?: (id: string) => void
}

export function CharacterCard({ character, onDelete }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const totalBattles = character.wins + character.losses + character.draws
  const winRate = totalBattles > 0 ? ((character.wins / totalBattles) * 100).toFixed(1) : "0.0"

  const handleDelete = () => {
    setIsDeleting(true)
    // In real app, delete from Firebase here
    setTimeout(() => {
      onDelete?.(character.id)
      setIsDeleting(false)
    }, 500)
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" />
            랭크 {character.rank}
          </Badge>
          <span className="text-xs text-muted-foreground">{character.createdAt.toLocaleDateString("ko-KR")}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
          <Image src={character.imageData || "/placeholder.svg"} alt="Character" fill className="object-contain" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-semibold text-green-600">{character.wins}</div>
            <div className="text-xs text-muted-foreground">승</div>
          </div>
          <div>
            <div className="font-semibold text-red-600">{character.losses}</div>
            <div className="text-xs text-muted-foreground">패</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-600">{character.draws}</div>
            <div className="text-xs text-muted-foreground">무</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">승률</div>
          <div className="text-2xl font-bold text-primary">{winRate}%</div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/battle?characterId=${character.id}`} className="flex-1">
          <Button className="w-full gap-2">
            <Swords className="h-4 w-4" />
            배틀 시작
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캐릭터 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 캐릭터를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
