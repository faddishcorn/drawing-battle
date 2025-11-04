'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'

export default function HomeRedirect() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    // 홈은 단순 리다이렉트: 로그인했으면 갤러리로, 아니면 로그인으로
    router.replace(user ? '/gallery' : '/login')
  }, [isLoading, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
