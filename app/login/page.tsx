"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Swords } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, loginAnonymously } = useAuth()
  const router = useRouter()

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login()

      if (success) {
        router.push("/gallery")
      } else {
        setError("Google 로그인에 실패했습니다. 다시 시도해주세요.")
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.")
    }

    setIsLoading(false)
  }

  const handleAnonymousLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await loginAnonymously()

      if (success) {
        router.push("/gallery")
      } else {
        setError("익명 로그인에 실패했습니다. 다시 시도해주세요.")
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Swords className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">배틀 드로잉</CardTitle>
          <CardDescription>
            로그인하여 캐릭터를 그리고 배틀을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGoogleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-white text-black hover:bg-gray-100 border border-gray-300"
              disabled={isLoading}
              size="lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "로그인 중..." : "Google로 로그인"}
            </Button>

            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                Google 계정이 있으면 바로 로그인할 수 있습니다. 없으면 새 계정을 만들 수 있습니다.
              </p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <form onSubmit={handleAnonymousLogin}>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "로그인 중..." : "익명으로 시작"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                로그인 없이 바로 게임을 즐길 수 있습니다
              </p>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
