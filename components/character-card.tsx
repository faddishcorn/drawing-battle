'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Swords, Trophy, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { db, storage } from '@/lib/firebase'
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, deleteObject, getDownloadURL } from 'firebase/storage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface CharacterProps {
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
}

interface CharacterCardProps {
  character: CharacterProps
  onDelete?: (id: string) => void
}

export function CharacterCard({ character, onDelete }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>(character.imageUrl)
  const { user } = useAuth()
  const { toast } = useToast()

  const winRate = character.totalBattles > 0 ? character.winRate.toFixed(1) : '0.0'

  const handleDelete = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Not authenticated',
        variant: 'destructive',
      })
      return
    }

    setIsDeleting(true)

    try {
      // Delete from Storage
      const storageRef = ref(storage, `characters/${user.id}/${character.id}.png`)
      await deleteObject(storageRef)

      // Delete character doc
      await deleteDoc(doc(db, 'characters', character.id))

      // Decrement user character count if user doc exists
      const userDocRef = doc(db, 'users', user.id)
      const userSnap = await getDoc(userDocRef)
      if (userSnap.exists()) {
        const count = userSnap.data()?.characterCount || 0
        await updateDoc(userDocRef, { characterCount: Math.max(0, count - 1) })
      }

      toast({
        title: 'Success',
        description: 'Character deleted successfully',
      })

      onDelete?.(character.id)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete character',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Resolve image URL for rendering (supports data URL, http(s) URL, or storage path)
  useEffect(() => {
    let mounted = true
    const loadUrl = async () => {
      try {
        if (character.imageUrl.startsWith('data:')) {
          setImageSrc(character.imageUrl)
          return
        }
        if (character.imageUrl.startsWith('http://') || character.imageUrl.startsWith('https://')) {
          if (mounted) setImageSrc(character.imageUrl)
          return
        }
        const url = await getDownloadURL(ref(storage, character.imageUrl))
        if (mounted) setImageSrc(url)
      } catch (e) {
        console.warn('Failed to resolve image URL', e)
      }
    }
    loadUrl()
    return () => {
      mounted = false
    }
  }, [character.imageUrl])

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate flex-1">{character.name}</h3>
          <Badge variant="secondary" className="gap-1 whitespace-nowrap">
            <Trophy className="h-3 w-3" />
            {character.rank}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
          <img
            src={imageSrc || '/placeholder.svg'}
            alt="Character"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-semibold text-green-600">{character.wins}</div>
            <div className="text-xs text-muted-foreground">승</div>
          </div>
          <div>
            <div className="font-semibold text-red-600">{character.losses}</div>
            <div className="text-xs text-muted-foreground">패</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-600">{character.draws}</div>
            <div className="text-xs text-muted-foreground">무</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">승률</div>
          <div className="text-2xl font-bold text-primary">{winRate}%</div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/battle?characterId=${character.id}`} className="flex-1">
          <Button className="w-full gap-2">
            <Swords className="h-4 w-4" />
            배틀 시작
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캐릭터 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 캐릭터를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
