export interface Character {
  id: string
  userId: string
  imageData: string
  rank: number
  wins: number
  losses: number
  draws: number
  createdAt: Date
}

export interface User {
  id: string
  email: string
  characters: Character[]
}

export interface BattleResult {
  id: string
  characterId: string
  opponentId: string
  result: "win" | "loss" | "draw"
  reasoning: string
  pointsChange: number
  createdAt: Date
}

// Mock users with characters
export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "player1@example.com",
    characters: [
      {
        id: "char-1",
        userId: "user-1",
        imageData: "/placeholder.svg?key=86bkz",
        rank: 1250,
        wins: 15,
        losses: 5,
        draws: 2,
        createdAt: new Date("2024-01-15"),
      },
      {
        id: "char-2",
        userId: "user-1",
        imageData: "/placeholder.svg?key=3a518",
        rank: 980,
        wins: 8,
        losses: 7,
        draws: 1,
        createdAt: new Date("2024-02-01"),
      },
    ],
  },
  {
    id: "user-2",
    email: "player2@example.com",
    characters: [
      {
        id: "char-3",
        userId: "user-2",
        imageData: "/placeholder.svg?key=wv25p",
        rank: 1450,
        wins: 22,
        losses: 3,
        draws: 1,
        createdAt: new Date("2024-01-10"),
      },
      {
        id: "char-4",
        userId: "user-2",
        imageData: "/placeholder.svg?key=j92ht",
        rank: 1100,
        wins: 12,
        losses: 8,
        draws: 3,
        createdAt: new Date("2024-01-20"),
      },
    ],
  },
  {
    id: "user-3",
    email: "player3@example.com",
    characters: [
      {
        id: "char-5",
        userId: "user-3",
        imageData: "/placeholder.svg?key=jqx9v",
        rank: 1350,
        wins: 18,
        losses: 6,
        draws: 2,
        createdAt: new Date("2024-01-25"),
      },
    ],
  },
]

// Current logged in user (for demo purposes)
export const currentUserId = "user-1"

export const mockCurrentUser = mockUsers.find((u) => u.id === currentUserId)!

// Get all characters sorted by rank
export function getAllCharactersByRank(): Character[] {
  const allCharacters = mockUsers.flatMap((user) => user.characters)
  return allCharacters.sort((a, b) => b.rank - a.rank)
}

// Get user's characters
export function getUserCharacters(userId: string): Character[] {
  const user = mockUsers.find((u) => u.id === userId)
  return user?.characters || []
}

// Get random opponent character (excluding user's own characters)
export function getRandomOpponent(userId: string): Character | null {
  const opponents = mockUsers.filter((u) => u.id !== userId).flatMap((u) => u.characters)

  if (opponents.length === 0) return null

  return opponents[Math.floor(Math.random() * opponents.length)]
}
