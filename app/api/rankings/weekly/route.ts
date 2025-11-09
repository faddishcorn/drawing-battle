import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, limit as fsLimit, orderBy, query, where } from 'firebase/firestore'

function getWeekKey(d = new Date()) {
  // ISO week key YYYY-Www
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7)
  const year = date.getUTCFullYear()
  return `${year}-W${String(week).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lim = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200)
    const weekKey = getWeekKey(new Date())
    try {
      // Try firebase-admin first if available and configured
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin') as any
      if (admin?.apps && admin.apps.length === 0) {
        const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON
        if (svcJson) {
          const cred = admin.credential.cert(JSON.parse(svcJson))
          admin.initializeApp({ credential: cred, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
        }
      }
      if (admin?.apps && admin.apps.length > 0) {
        const adb = admin.firestore()
        const snap = await adb
          .collection('characters')
          .where('weeklyKey', '==', weekKey)
          .orderBy('weeklyPoints', 'desc')
          .limit(lim)
          .get()

        const list = snap.docs.map((d: any) => {
          const data = d.data() || {}
          return {
            id: data.id || d.id,
            name: data.name,
            userId: data.userId,
            imageUrl: data.imageUrl,
            rank: data.weeklyPoints || 0,
            wins: data.weeklyWins || 0,
            losses: data.weeklyLosses || 0,
            draws: data.weeklyDraws || 0,
            winRate: data.weeklyWinRate || 0,
            totalBattles: data.weeklyTotalBattles || 0,
          }
        })
        return NextResponse.json({ success: true, weekKey, characters: list })
      }
      // Fallback: use client Firestore SDK on server (works with public config)
      // Fetch ALL characters (no where clause to avoid permission issues) and filter in memory
      const allSnap = await getDocs(collection(db, 'characters'))
      const all = allSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((c) => c.weeklyKey === weekKey)
      
      const sorted = all
        .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0))
        .slice(0, lim)
        .map((data) => ({
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
      return NextResponse.json({ 
        success: true, 
        weekKey, 
        characters: sorted
      })
    } catch (inner) {
      // Final fallback: return empty weekly list instead of 500
      return NextResponse.json({ success: true, weekKey, characters: [] })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load weekly rankings' }, { status: 500 })
  }
}
