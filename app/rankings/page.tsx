"use client"

import { useState, useEffect } from "react"
import { RankingsList } from "@/components/rankings-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { db } from "@/lib/firebase"
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore"

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

export default function RankingsPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const q = query(collection(db, "characters"), orderBy("rank", "desc"), limit(100))
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => d.data() as Character)
        setCharacters(list)
      } catch (error) {
        console.error("Error fetching rankings:", error)
        setCharacters([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const topCharacters = characters.slice(0, 10)
  const allCharacters = characters

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">글로벌 랭킹</h2>
            <p className="text-muted-foreground">최고의 전사들과 경쟁하세요!</p>
          </div>

          <Tabs defaultValue="top10" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="top10">Top 10</TabsTrigger>
              <TabsTrigger value="all">전체 랭킹</TabsTrigger>
            </TabsList>
            <TabsContent value="top10" className="mt-6">
              <RankingsList characters={topCharacters} showTopBadges />
            </TabsContent>
            <TabsContent value="all" className="mt-6">
              <RankingsList characters={allCharacters} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
