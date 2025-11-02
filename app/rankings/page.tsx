"use client"

import { useState } from "react"
import { RankingsList } from "@/components/rankings-list"
import { getAllCharactersByRank } from "@/lib/mock-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RankingsPage() {
  const [characters] = useState(() => getAllCharactersByRank())

  const topCharacters = characters.slice(0, 10)
  const allCharacters = characters

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
