"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DrawingCanvas } from "@/components/drawing-canvas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { mockCurrentUser } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"

export default function DrawPage() {
  const [characterName, setCharacterName] = useState("")
  const [savedImage, setSavedImage] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSave = (imageData: string) => {
    if (!characterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your character",
        variant: "destructive",
      })
      return
    }

    if (mockCurrentUser.characters.length >= 3) {
      toast({
        title: "Character Limit Reached",
        description: "You can only have 3 characters. Delete one to create a new one.",
        variant: "destructive",
      })
      return
    }

    setSavedImage(imageData)

    // In a real app, this would save to Firebase
    toast({
      title: "Character Saved!",
      description: `${characterName} has been created successfully.`,
    })

    // Simulate saving and redirect
    setTimeout(() => {
      router.push("/gallery")
    }, 1500)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Character</CardTitle>
            <CardDescription>Draw your character and give it a name. You can have up to 3 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name</Label>
              <Input
                id="character-name"
                placeholder="Enter character name..."
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                maxLength={30}
              />
            </div>
          </CardContent>
        </Card>

        <DrawingCanvas onSave={handleSave} />
      </div>
    </div>
  )
}
