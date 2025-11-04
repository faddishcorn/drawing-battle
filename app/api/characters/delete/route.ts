import { type NextRequest, NextResponse } from 'next/server'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'

export async function DELETE(request: NextRequest) {
  try {
    const { characterId, userId } = await request.json()

    if (!characterId || !userId) {
      return NextResponse.json({ error: 'Missing characterId or userId' }, { status: 400 })
    }

    // Get character document
    const characterDocRef = doc(db, 'characters', characterId)
    const characterDocSnap = await getDoc(characterDocRef)

    if (!characterDocSnap.exists()) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Verify ownership
    if (characterDocSnap.data().userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from Storage
    try {
      const filePath = `characters/${userId}/${characterId}.png`
      const storageRef = ref(storage, filePath)
      await deleteObject(storageRef)
    } catch (storageError) {
      console.warn('Storage deletion warning:', storageError)
      // Continue even if storage deletion fails
    }

    // Delete from Firestore
    await deleteDoc(characterDocRef)

    // Update user's character count
    const userDocRef = doc(db, 'users', userId)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      const currentCount = userDocSnap.data()?.characterCount || 0
      await updateDoc(userDocRef, {
        characterCount: Math.max(0, currentCount - 1),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Character deleted successfully',
    })
  } catch (error) {
    console.error('Character deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
  }
}
