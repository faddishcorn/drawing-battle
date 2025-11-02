'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Pencil, Undo2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawingCanvasProps {
  onSave: (imageData: string) => void
  isDisabled?: boolean
}

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
]

export function DrawingCanvas({ onSave, isDisabled = false }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [isEraser, setIsEraser] = useState(false)
  const [lineWidth, setLineWidth] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 400

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor
    ctx.lineWidth = isEraser ? lineWidth * 3 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = canvas.toDataURL('image/png')
    onSave(imageData)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <Button
          variant={!isEraser ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsEraser(false)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          펜
        </Button>
        <Button
          variant={isEraser ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsEraser(true)}
        >
          <Eraser className="h-4 w-4 mr-2" />
          지우개
        </Button>
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Undo2 className="h-4 w-4 mr-2" />
          전체 지우기
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-center">
        {COLORS.map((color) => (
          <button
            key={color.value}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
              currentColor === color.value && !isEraser
                ? 'border-foreground scale-110'
                : 'border-border'
            )}
            style={{ backgroundColor: color.value }}
            onClick={() => {
              setCurrentColor(color.value)
              setIsEraser(false)
            }}
            title={color.name}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <label className="text-sm font-medium">선 굵기:</label>
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-sm text-muted-foreground">{lineWidth}px</span>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="border-2 border-border rounded-lg cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="flex justify-center">
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={isDisabled}>
          <Save className="h-5 w-5" />
          {isDisabled ? "저장 중..." : "캐릭터 저장"}
        </Button>
      </div>
    </div>
  )
}
