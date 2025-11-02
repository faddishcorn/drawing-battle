import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const limitParam = parseInt(request.nextUrl.searchParams.get("limit") || "100")
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0")

    const safeLimit = Math.min(limitParam, 100) // Max 100 per request

    // Query characters sorted by rank (descending)
    const q = query(
      collection(db, "characters"),
      orderBy("rank", "desc"),
      limit(safeLimit + offset)
    )

    const querySnapshot = await getDocs(q)
    const allCharacters = querySnapshot.docs.map((doc) => doc.data())

    // Apply offset
    const characters = allCharacters.slice(offset, offset + safeLimit)

    return NextResponse.json({
      success: true,
      characters,
      count: characters.length,
      offset,
      limit: safeLimit,
    })
  } catch (error) {
    console.error("Rankings API error:", error)
    return NextResponse.json({ error: "Failed to fetch rankings" }, { status: 500 })
  }
}
