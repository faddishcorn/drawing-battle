import type { Timestamp } from 'firebase/firestore'

export type BattleState = 'ready' | 'matching' | 'battling' | 'finished'
export type BattleResult = 'win' | 'loss' | 'draw'

export interface Character {
  id: string
  name: string
  userId: string
  imageUrl: string
  rank: number
  wins: number
  losses: number
  draws: number
  winRate: number
  totalBattles: number
  lastBattleAt?: Timestamp
  lastOpponentId?: string
}
