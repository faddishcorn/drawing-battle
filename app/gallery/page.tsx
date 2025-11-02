"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { CharacterCard } from "@/components/character-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

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

export default function GalleryPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return

      try {
        const q = query(collection(db, "characters"), where("userId", "==", user.id))
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => d.data() as Character)
        setCharacters(list)
      } catch (error) {
        console.error("Error fetching characters:", error)
        setCharacters([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user && !authLoading) {
      fetchCharacters()
    }
  }, [user, authLoading])

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">내 캐릭터</h2>
              <p className="text-muted-foreground mt-1">
                최대 3개의 캐릭터를 보유할 수 있습니다 ({characters.length}/3)
              </p>
            </div>
            {characters.length < 3 && (
              <Link href="/draw">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />새 캐릭터 그리기
                </Button>
              </Link>
            )}
          </div>

          {characters.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-6xl">🎨</div>
              <h3 className="text-xl font-semibold">아직 캐릭터가 없습니다</h3>
              <p className="text-muted-foreground">첫 번째 전투 캐릭터를 그려보세요!</p>
              <Link href="/draw">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  캐릭터 그리기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} onDelete={() => {
                  setCharacters(characters.filter(c => c.id !== character.id))
                }} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
