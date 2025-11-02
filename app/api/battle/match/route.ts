import { NextResponse } from "next/server"
import { getRandomOpponent } from "@/lib/mock-data"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    // Get random opponent
    const opponent = getRandomOpponent(userId)

    return NextResponse.json({ opponent })
  } catch (error) {
    console.error("Match error:", error)
    return NextResponse.json({ error: "Failed to find opponent" }, { status: 500 })
  }
}
