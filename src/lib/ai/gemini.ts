import fs from 'fs'
import path from 'path'

/**
 * Robust helper to get the Gemini API Key.
 * Checks process.env first, then directly reads from .env.local and .env on disk.
 * This guarantees it works IMMEDIATELY even if 'next dev' hasn't been restarted!
 */
export function getGeminiApiKey(): string {
  // 1. Prioritize project files (.env.local, then .env)
  try {
    const cwd = process.cwd()
    const candidates = ['.env.local', '.env']
    for (const filename of candidates) {
      const fullPath = path.resolve(/*turbopackIgnore: true*/ cwd, filename)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        const match =
          content.match(/^GEMINI_API_KEY=(.+)$/m) ||
          content.match(/^AI_API_KEY=(.+)$/m)
        if (match && match[1]) {
          const key = match[1].trim().replace(/^["']|["']$/g, '')
          if (key && !key.startsWith('#')) {
            return key
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not read env file from disk:', err)
  }

  // 2. Fallback to process.env
  const envKey = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim()
  if (envKey) return envKey

  return ''
}

export interface GeminiCallOptions {
  maxTokens?: number
  temperature?: number
}

/**
 * Calls Google Gemini using active 2026 models with fast response time.
 */
export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<{ text: string; model: string }> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from environment and .env files.')
  }

  const { maxTokens = 1024, temperature = 0.7 } = options

  // gemini-3.5-flash-lite is fastest (1-2s response), followed by flash
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ]

  let lastError: Error | null = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg =
          errorData?.error?.message || `Gemini API returned status ${response.status}`
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      const textPart = parts.find((p: any) => typeof p.text === 'string' && p.text.trim() !== '')
      const text = textPart?.text || parts[0]?.text

      if (text) {
        return { text: text.trim(), model }
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini')
}
