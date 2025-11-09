import type React from 'react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { Navigation } from '@/components/navigation'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { GAListener } from '@/components/ga-listener'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '배틀 드로잉 - 캐릭터 배틀 게임',
  description:
    '직접 그린 캐릭터로 실시간 AI 배틀을 즐겨보세요. 캐릭터를 그리고, 프롬프트로 강화하고, 다른 플레이어와 대결하세요. 주간 랭킹 시스템과 갤러리 기능을 제공합니다.',
  keywords: [
    '배틀 드로잉',
    '캐릭터 배틀',
    '그림 게임',
    'AI 배틀',
    '온라인 게임',
    '캐릭터 대결',
    '드로잉 게임',
    '랭킹 시스템',
  ],
  authors: [{ name: '배틀 드로잉' }],
  creator: '배틀 드로잉',
  publisher: '배틀 드로잉',
  generator: 'Next.js',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://drawing-battle.vercel.app'),
  openGraph: {
    title: '배틀 드로잉 - 캐릭터 배틀 게임',
    description:
      '직접 그린 캐릭터로 실시간 AI 배틀을 즐겨보세요. 캐릭터를 그리고, 프롬프트로 강화하고, 다른 플레이어와 대결하세요.',
    type: 'website',
    siteName: '배틀 드로잉',
    locale: 'ko_KR',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: '배틀 드로잉 - 캐릭터 배틀 게임',
    description:
      '직접 그린 캐릭터로 실시간 AI 배틀을 즐겨보세요. 캐릭터를 그리고, 프롬프트로 강화하고, 다른 플레이어와 대결하세요.',
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://drawing-battle.vercel.app'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '배틀 드로잉',
    applicationCategory: 'Game',
    genre: 'Drawing Game',
    description:
      '직접 그린 캐릭터로 실시간 AI 배틀을 즐겨보세요. 캐릭터를 그리고, 프롬프트로 강화하고, 다른 플레이어와 대결하세요.',
    url: siteUrl,
    inLanguage: 'ko-KR',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '캐릭터 그리기',
      'AI 기반 실시간 배틀',
      '주간 랭킹 시스템',
      '캐릭터 갤러리',
      '프롬프트 강화 시스템',
    ],
  }

  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="beforeInteractive"
            />
            <Script id="gtag-init" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        ) : null}
        <AuthProvider>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Toaster />
        </AuthProvider>
        {GA_ID ? (
          <Suspense fallback={null}>
            <GAListener />
          </Suspense>
        ) : null}
        <Analytics />
      </body>
    </html>
  )
}
