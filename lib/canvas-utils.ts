export interface DrawingTool {
  type: "pen" | "eraser"
  color: string
  size: number
}

export const DEFAULT_COLORS = [
  "#000000", // Black
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFFFFF", // White
]

export const BRUSH_SIZES = [2, 5, 10, 15, 20]

export function initializeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Set canvas size
  canvas.width = 600
  canvas.height = 600

  // Fill with white background
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Set default drawing properties
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  return ctx
}

export function getCanvasDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png")
}

export function loadCanvasFromDataURL(canvas: HTMLCanvasElement, dataURL: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve()
      } else {
        reject(new Error("Could not get canvas context"))
      }
    }
    img.onerror = reject
    img.src = dataURL
  })
}
