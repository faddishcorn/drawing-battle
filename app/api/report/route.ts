import { NextRequest, NextResponse } from 'next/server'

// Minimal server-side report ingestion.
// Attempts to use firebase-admin if available; otherwise stores nothing but returns persisted=false.

interface ReportPayload {
  targetType: 'character' | 'battle' | 'user'
  targetId: string
  reason: string
  details?: string
  // optional reporter info (client-provided)
  reporterId?: string
  reporterIsAnonymous?: boolean
}

function extractStoragePath(input?: string): string | undefined {
  if (!input) return undefined
  try {
    if (input.startsWith('gs://')) {
      const m = input.replace('gs://', '').split('/')
      m.shift() // bucket
      return m.join('/') || undefined
    }
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const u = new URL(input)
      const host = u.hostname
      if (host.endsWith('.firebasestorage.app')) {
        const enc = u.pathname.split('/o/')[1]?.split('?')[0]
        return enc ? decodeURIComponent(enc) : undefined
      }
      if (host === 'firebasestorage.googleapis.com') {
        const m = u.pathname.match(/\/b\/[^/]+\/o\/(.+)/)
        if (m) return decodeURIComponent(m[1])
      }
    }
    // assume already a storage path
    return input
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  let persisted = false
  let id: string | undefined
  let error: string | undefined
  try {
    const body = (await req.json()) as Partial<ReportPayload>
    if (!body.targetType || !body.targetId || !body.reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const payload: ReportPayload = {
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason.slice(0, 120), // trim excessively long reasons
      details: body.details?.slice(0, 1000),
      reporterId: body.reporterId,
      reporterIsAnonymous: body.reporterIsAnonymous,
    }

    // Try firebase-admin dynamic require (optional dependency)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin') as any
      if (!admin.apps || admin.apps.length === 0) {
        const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON
        if (!svcJson) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY_JSON')
        const cred = admin.credential.cert(JSON.parse(svcJson))
        admin.initializeApp({
          credential: cred,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
      }
      const db = admin.firestore()
      const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      id = reportId
      // Enrich with target snapshot for quicker triage
      let targetName: string | undefined
      let targetUserId: string | undefined
      let targetImageUrl: string | undefined
      let targetStoragePath: string | undefined

      if (payload.targetType === 'character') {
        try {
          const snap = await db.collection('characters').doc(String(payload.targetId)).get()
          if (snap.exists) {
            const d = snap.data() as any
            targetName = String(d?.name ?? '') || undefined
            targetUserId = String(d?.userId ?? '') || undefined
            targetImageUrl = typeof d?.imageUrl === 'string' ? d.imageUrl : undefined
            targetStoragePath =
              typeof d?.storagePath === 'string'
                ? d.storagePath
                : extractStoragePath(targetImageUrl)
          }
        } catch {
          // ignore
        }
      }

      await db.collection('reports').doc(reportId).set({
        id: reportId,
        ...payload,
        targetName,
        targetUserId,
        targetImageUrl,
        targetStoragePath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending', // moderation status pipeline placeholder
      })
      persisted = true
    } catch (e: any) {
      error = e?.message || 'admin unavailable'
    }
    return NextResponse.json({ success: true, persisted, id, error })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid request' }, { status: 400 })
  }
}
