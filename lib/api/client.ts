export interface ApiError extends Error {
  status?: number
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return text ? (JSON.parse(text) as T) : ({} as T)
  } catch (_e) {
    const err = new Error('Invalid JSON from API') as ApiError
    err.status = res.status
    throw err
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    let msg = `API error ${res.status}`
    try {
      const b = await res.clone().json()
      if (b?.message) msg = b.message
    } catch {
      // ignore parse error of error body
    }
    const err = new Error(msg) as ApiError
    err.status = res.status
    throw err
  }
  return parseJson<T>(res)
}
