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
  const [weekly, setWeekly] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'weekly' | 'all'>('weekly')

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const q = query(collection(db, 'characters'), orderBy('rank', 'asc'), limit(100))
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => d.data() as Character)
        // rank 낮을수록 상위? 기존 컴포넌트는 큰 값이 상위처럼 표시하므로 내림차순 정렬
        setCharacters(list.sort((a, b) => b.rank - a.rank))
      } catch (error) {
        console.error('Error fetching rankings:', error)
        setCharacters([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [])

  useEffect(() => {
    const fetchWeekly = async () => {
      setIsWeeklyLoading(true)
      try {
        // Fetch directly from Firestore with auth token (bypasses API permission issues)
        const getWeekKey = (d: Date) => {
          const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
          const dayNum = (date.getUTCDay() + 6) % 7
          date.setUTCDate(date.getUTCDate() - dayNum + 3)
          const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
          const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7)
          const year = date.getUTCFullYear()
          return `${year}-W${String(week).padStart(2, '0')}`
        }
        // Only get Date on client side inside useEffect
        const weekKey = getWeekKey(new Date())
        
        // Get all characters and filter by weeklyKey in memory (avoids index requirement)
        const snap = await getDocs(collection(db, 'characters'))
        const all = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((c: any) => c.weeklyKey === weekKey)
          .sort((a: any, b: any) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0))
          .slice(0, 100)
          .map((data: any) => ({
            id: data.id,
            name: data.name,
            userId: data.userId,
            imageUrl: data.imageUrl,
            rank: data.weeklyPoints || 0,
            wins: data.weeklyWins || 0,
            losses: data.weeklyLosses || 0,
            draws: data.weeklyDraws || 0,
            winRate: data.weeklyWinRate || 0,
            totalBattles: data.weeklyTotalBattles || 0,
          }))
        
        setWeekly(all as Character[])
      } catch (e) {
        console.error('Weekly rankings error:', e)
        setWeekly([])
      } finally {
        setIsWeeklyLoading(false)
      }
    }
    if (tab === 'weekly') fetchWeekly()
  }, [tab])

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

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="weekly" className="text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                🏆 주간 랭킹
              </TabsTrigger>
              <TabsTrigger value="all" className="text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                📊 전체 랭킹
              </TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="mt-6">
              {isWeeklyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      이번 주 배틀 성적 기준 · 매주 월요일 초기화
                    </p>
                  </div>
                  <RankingsList characters={weekly.slice(0, 10)} showTopBadges />
                  {weekly.length > 10 && (
                    <div className="mt-6">
                      <RankingsList characters={weekly.slice(10)} offset={10} />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                <div className="mb-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    누적 전적 기준 · 전체 시즌 통합
                  </p>
                </div>
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
