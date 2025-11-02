"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { BattleArena } from "@/components/battle-arena"
import { getUserCharacters, type Character } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

function BattleContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const characterId = searchParams.get("characterId")

  const [myCharacter, setMyCharacter] = useState<Character | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }

    if (!user || !characterId) return

    const characters = getUserCharacters(user.id)
    const character = characters.find((c) => c.id === characterId)

    if (!character) {
      router.push("/gallery")
      return
    }

    setMyCharacter(character)
  }, [characterId, router, user, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!myCharacter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚔️</div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Link href="/gallery">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />내 캐릭터로 돌아가기
            </Button>
          </Link>
          <BattleArena myCharacter={myCharacter} />
        </div>
      </main>
    </div>
  )
}

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚔️</div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      }
    >
      <BattleContent />
    </Suspense>
  )
}
