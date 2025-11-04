export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''

type Gtag = (
  command: 'config' | 'event',
  targetIdOrAction: string,
  params?: Record<string, unknown>,
) => void

function getGtag(): Gtag | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { gtag?: Gtag }).gtag
}

export function pageview(url: string) {
  if (!GA_ID) return
  try {
    getGtag()?.('config', GA_ID, { page_path: url })
  } catch {
    // noop
  }
}

export function gaEvent(action: string, params: Record<string, unknown> = {}) {
  if (!GA_ID) return
  try {
    getGtag()?.('event', action, params)
  } catch {
    // noop
  }
}
