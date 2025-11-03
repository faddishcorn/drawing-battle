import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert data URL (image/png) to Blob
export function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(",")
  const mimeMatch = /data:(.*?);base64/.exec(header || "")
  const mime = mimeMatch?.[1] || "image/png"
  const binary = atob(base64 || "")
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
