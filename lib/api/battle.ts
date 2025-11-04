import type { BattleResult } from '@/lib/types'
import { apiFetch } from './client'

export interface BattleRequestBody {
  player: { id: string; imageUrl?: string }
  opponent: { id: string; imageUrl?: string }
}

export interface BattleResponse {
  result: BattleResult
  pointsChange: number
  reasoning: string
  updatedPlayer?: unknown
  updatedOpponent?: unknown
  persisted?: boolean
}

export async function requestBattle(body: BattleRequestBody) {
  return apiFetch<BattleResponse>('/api/battle', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
