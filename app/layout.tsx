import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Navigation } from "@/components/navigation"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "배틀 드로잉 - 캐릭터 배틀 게임",
  description: "직접 그린 캐릭터로 실시간 배틀을 즐겨보세요.",
  generator: "v0.app",
  openGraph: {
    title: "배틀 드로잉 - 캐릭터 배틀 게임",
    description: "직접 그린 캐릭터로 실시간 배틀을 즐겨보세요.",
    type: "website",
    siteName: "배틀 드로잉",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "배틀 드로잉 - 캐릭터 배틀 게임",
    description: "직접 그린 캐릭터로 실시간 배틀을 즐겨보세요.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
  <html lang="ko">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
