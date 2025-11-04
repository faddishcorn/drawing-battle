'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DrawingCanvas } from '@/components/drawing-canvas'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'
import { db, storage } from '@/lib/firebase'
import { dataURLToBlob } from '@/lib/utils'
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function DrawPage() {
  const [characterName, setCharacterName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user === null) {
      router.push('/login')
    } else {
      setAuthLoading(false)
    }
  }, [user, router])

  const handleSave = async (imageData: string) => {
    if (!characterName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your character',
        variant: 'destructive',
      })
      return
    }

    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in first',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate character ID
      const characterId = `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Convert data URL to Blob
      const blob = dataURLToBlob(imageData)

      // Upload to Storage directly from client
      const filePath = `characters/${user.id}/${characterId}.png`
      const storageRef = ref(storage, filePath)

      if (process.env.NODE_ENV !== 'production') {
        console.log('Uploading to Storage:', filePath)
      }

      try {
        await uploadBytes(storageRef, blob, {
          contentType: 'image/png',
        })
        if (process.env.NODE_ENV !== 'production') {
          console.log('Upload successful')
        }
      } catch (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(
          `Storage upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
        )
      }

      // Resolve public download URL and store it in Firestore
      let downloadURL = ''
      try {
        downloadURL = await getDownloadURL(storageRef)
      } catch (urlError) {
        console.warn('Failed to resolve download URL, fallback to storage path', urlError)
        downloadURL = filePath
      }

      // Create character document in Firestore (client-side with auth)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Creating character document in Firestore')
      }

      // Check and update user's character count
      const userDocRef = doc(db, 'users', user.id)
      const userSnap = await getDoc(userDocRef)
      if (!userSnap.exists()) {
        // Create user doc if missing (first login might not have created yet)
        await setDoc(userDocRef, {
          id: user.id,
          email: user.email,
          characterCount: 0,
          createdAt: new Date(),
        })
      }
      const currentCount = (await getDoc(userDocRef)).data()?.characterCount || 0
      if (currentCount >= 3) {
        throw new Error('You can have up to 3 characters only')
      }

      const characterDocRef = doc(collection(db, 'characters'), characterId)
      await setDoc(characterDocRef, {
        id: characterId,
        name: characterName,
        userId: user.id,
        // Prefer public download URL to avoid 404s when rendering
        imageUrl: downloadURL,
        // Random key for fair matchmaking (rank-agnostic sampling)
        rand: Math.random(),
        rank: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        totalBattles: 0,
        winRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await updateDoc(userDocRef, { characterCount: currentCount + 1 })

      toast({
        title: '캐릭터 저장 완료!',
        description: `${characterName} 그림이 저장되었습니다.`,
      })

      // Reset form
      setCharacterName('')

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/gallery')
      }, 1500)
    } catch (error) {
      console.error('Full error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create character',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>당신의 캐릭터를 그려보세요</CardTitle>
            <CardDescription>
              캐릭터를 그리고 이름을 부여하세요. 그림은 3개까지 그릴 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">캐릭터 이름</Label>
              <Input
                id="character-name"
                placeholder="캐릭터 이름을 입력하세요..."
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                maxLength={30}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <DrawingCanvas onSave={handleSave} isDisabled={isLoading} />
      </div>
    </div>
  )
}
