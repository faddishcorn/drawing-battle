"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingDown, Minus } from "lucide-react"
import type { BattleResult } from "@/lib/mock-data"

interface BattleResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BattleResult | null
}

export function BattleResultDialog({ open, onOpenChange, result }: BattleResultDialogProps) {
  if (!result) return null

  const getResultIcon = () => {
    switch (result.result) {
      case "win":
        return <Trophy className="h-8 w-8 text-yellow-500" />
      case "lose":
        return <TrendingDown className="h-8 w-8 text-red-500" />
      case "draw":
        return <Minus className="h-8 w-8 text-gray-500" />
    }
  }

  const getResultColor = () => {
    switch (result.result) {
      case "win":
        return "bg-green-500"
      case "lose":
        return "bg-red-500"
      case "draw":
        return "bg-gray-500"
    }
  }

  const getResultText = () => {
    switch (result.result) {
      case "win":
        return "Victory!"
      case "lose":
        return "Defeat"
      case "draw":
        return "Draw"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">{getResultIcon()}</div>
          <DialogTitle className="text-center text-2xl">{getResultText()}</DialogTitle>
          <DialogDescription className="text-center">
            <Badge className={cn("mt-2", getResultColor())}>
              {result.pointsChanged > 0 ? "+" : ""}
              {result.pointsChanged} Points
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">AI Judgment:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.aiReasoning}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
