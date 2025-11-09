import { apiFetch } from '@/lib/api/client'

export type ReportTargetType = 'character' | 'battle' | 'user'

export interface SubmitReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: string
  details?: string
  reporterId?: string
  reporterIsAnonymous?: boolean
}

export async function submitReport(input: SubmitReportInput) {
  return apiFetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
