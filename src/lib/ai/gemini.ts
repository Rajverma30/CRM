import fs from 'fs'
import path from 'path'

/**
 * Robust helper to get the Gemini API Key.
 * Checks process.env first (loaded automatically by Next.js from .env.local).
 * Also performs multi-path scanning of .env.local and .env on disk as backup.
 */
export function getGeminiApiKey(): string {
  // 1. Check process.env (Next.js automatically loads .env.local)
  const envKey = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim()
  if (envKey && !envKey.startsWith('#')) return envKey

  // 2. Read dynamically from .env.local and .env from disk
  try {
    const cwd = process.cwd()
    const potentialDirs = [
      cwd,
      path.resolve(cwd, '..'),
      path.resolve(__dirname, '../../..'),
      path.resolve(__dirname, '../../../..'),
      'S:/Machine learning/Startup/CRM',
      's:/Machine learning/Startup/CRM',
    ]

    for (const dir of potentialDirs) {
      for (const filename of ['.env.local', '.env']) {
        try {
          const fullPath = path.resolve(dir, filename)
          if (fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
            const content = fs.readFileSync(/*turbopackIgnore: true*/ fullPath, 'utf8')
            const match =
              content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m) ||
              content.match(/^\s*AI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m)
            if (match && match[1]) {
              const key = match[1].trim()
              if (key && !key.startsWith('#')) {
                return key
              }
            }
          }
        } catch {
          // ignore directory access error and continue
        }
      }
    }
  } catch (err) {
    console.warn('Could not read env file from disk:', err)
  }

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

  // Tested active 2026 models with fast response times
  const models = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
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
        signal: AbortSignal.timeout(12000),
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
        throw new Error(`[${model}] ${errorMsg}`)
      }

      const data = await response.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      const textPart = parts.find((p: any) => typeof p.text === 'string' && p.text.trim() !== '')
      const text = textPart?.text || parts[0]?.text

      if (text) {
        console.log(`[Gemini] Generated successfully using model: ${model}`)
        return { text: text.trim(), model }
      }
    } catch (err) {
      console.warn(`[Gemini] Model ${model} attempt failed:`, err instanceof Error ? err.message : err)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini')
}
