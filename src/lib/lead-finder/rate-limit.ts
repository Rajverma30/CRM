const hits = new Map<string, number[]>()

export function checkRateLimit(key: string, maxRequests: number, windowSeconds = 60): void {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const bucket = (hits.get(key) ?? []).filter(t => t >= windowStart)

  if (bucket.length >= maxRequests) {
    throw new RateLimitError(
      `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds.`
    )
  }

  bucket.push(now)
  hits.set(key, bucket)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}
