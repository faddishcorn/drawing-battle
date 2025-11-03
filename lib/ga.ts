export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ""

export function pageview(url: string) {
  if (!GA_ID) return
  try {
    ;(window as any).gtag?.("config", GA_ID, { page_path: url })
  } catch {}
}

export function gaEvent(action: string, params: Record<string, any> = {}) {
  if (!GA_ID) return
  try {
    ;(window as any).gtag?.("event", action, params)
  } catch {}
}
