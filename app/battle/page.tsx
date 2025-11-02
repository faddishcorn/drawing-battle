"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { BattleArena } from "@/components/battle-arena"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface Character {
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

function BattleContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const characterId = searchParams.get("characterId")

  const [myCharacter, setMyCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!user || !characterId) {
        setIsLoading(false)
        return
      }

      try {
        const ref = doc(db, "characters", characterId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          router.push("/gallery")
          return
        }
        const data = snap.data() as Character
        // ownership check
        if (data.userId !== user.id) {
          router.push("/gallery")
          return
        }
        setMyCharacter(data)
      } catch (error) {
        console.error("Error fetching character:", error)
        router.push("/gallery")
      } finally {
        setIsLoading(false)
      }
    }

    if (user && !authLoading && characterId) {
      fetchCharacter()
    }
  }, [characterId, router, user, authLoading])

  if (authLoading || isLoading) {
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
          <p className="text-muted-foreground">캐릭터를 찾을 수 없습니다</p>
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
          <BattleArena myCharacter={myCharacter} userId={user.id} />
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
