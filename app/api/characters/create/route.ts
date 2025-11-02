import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, collection } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { characterId, characterName, userId, imageUrl } = await request.json()

    if (!characterId || !characterName || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user is authenticated via authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check character count
    const userDocRef = doc(db, "users", userId)
    const userDocSnap = await getDoc(userDocRef)

    if (!userDocSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const characterCount = userDocSnap.data()?.characterCount || 0
    if (characterCount >= 3) {
      return NextResponse.json({ error: "Maximum 3 characters allowed" }, { status: 400 })
    }

    // Create character document in Firestore
    const characterData = {
      id: characterId,
      name: characterName,
      userId: userId,
      imageUrl: `characters/${userId}/${imageUrl}`,
      rank: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      totalBattles: 0,
      winRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const characterDocRef = doc(collection(db, "characters"), characterId)
    await setDoc(characterDocRef, characterData)

    // Update user's character count
    await updateDoc(userDocRef, {
      characterCount: characterCount + 1,
    })

    return NextResponse.json({
      success: true,
      characterId,
      message: "Character created successfully",
    })
  } catch (error) {
    console.error("Character creation error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error details:", errorMessage)
    return NextResponse.json({ 
      error: "Failed to create character",
      details: errorMessage 
    }, { status: 500 })
  }
}
