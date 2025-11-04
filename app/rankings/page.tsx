'use client'

import { useState, useEffect } from 'react'
import { RankingsList } from '@/components/rankings-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore'

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
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const q = query(collection(db, 'characters'), orderBy('rank', 'desc'), limit(100))
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => d.data() as Character)
        setCharacters(list)
      } catch (error) {
        console.error('Error fetching rankings:', error)
        setCharacters([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const topCharacters = characters.slice(0, 10)
  const allCharacters = characters
  const PAGE_SIZE = 25
  const pageCount = Math.max(1, Math.ceil(allCharacters.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const pagedAllCharacters = allCharacters.slice(start, end)

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
              <div className="space-y-4">
                <RankingsList characters={pagedAllCharacters} offset={start} />
                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    이전
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {currentPage} / {pageCount} 페이지 · 총 {allCharacters.length}개
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage >= pageCount}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
