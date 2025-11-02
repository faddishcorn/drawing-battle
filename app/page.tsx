"use client"

import { useState, useEffect } from "react"
import { DrawingCanvas } from "@/components/drawing-canvas"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserCharacters } from "@/lib/mock-data"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

export default function DrawPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const handleSave = (imageData: string) => {
    if (!user) {
      setError("로그인이 필요합니다.")
      router.push("/login")
      return
    }

    const userCharacters = getUserCharacters(user.id)

    if (userCharacters.length >= 3) {
      setError("최대 3개의 캐릭터만 보유할 수 있습니다. 기존 캐릭터를 삭제한 후 다시 시도해주세요.")
      return
    }

    // In real app, save to Firebase here
    console.log("[v0] Saving character for user:", user.id, imageData)

    // Redirect to gallery
    router.push("/gallery")
  }

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">캐릭터 그리기</h2>
            <p className="text-muted-foreground">
              당신만의 전투 캐릭터를 그려보세요! 그린 캐릭터로 다른 플레이어와 배틀할 수 있습니다.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DrawingCanvas onSave={handleSave} />
        </div>
      </main>
    </div>
  )
}
