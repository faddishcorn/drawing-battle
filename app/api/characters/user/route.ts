import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Query characters by userId
    const q = query(
      collection(db, "characters"),
      where("userId", "==", userId)
    )

    const querySnapshot = await getDocs(q)
    const characters = querySnapshot.docs.map((doc) => doc.data())

    return NextResponse.json({
      success: true,
      characters,
      count: characters.length,
    })
  } catch (error) {
    console.error("Get user characters error:", error)
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 })
  }
}
