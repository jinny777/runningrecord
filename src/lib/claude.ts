/**
 * Claude API 클라이언트
 *
 * 프로덕션: Supabase Edge Function을 통해 호출 (API 키 노출 방지)
 * 개발 데모: VITE_USE_DIRECT_CLAUDE=true 설정 시 직접 호출
 *
 * Edge Function 엔드포인트:
 *   - /functions/v1/analyze-ocr
 *   - /functions/v1/health-coach
 *   - /functions/v1/generate-report
 */

import { supabase } from './supabase'
import type { WorkoutOCRResult, WeightOCRResult, CoachMessage } from '../types'
import type { WorkoutContext } from '../services/claude-prompts'

const USE_DIRECT = import.meta.env.VITE_USE_DIRECT_CLAUDE === 'true'
const DIRECT_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

// ─── Edge Function 호출 헬퍼 ────────────────────────────────────────────────────

async function callEdgeFunction<T>(fnName: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fnName, { body })
  if (error) throw new Error(error.message)
  return data as T
}

// ─── 직접 호출 헬퍼 (demo only) ─────────────────────────────────────────────────

async function callClaudeDirect(messages: { role: string; content: unknown }[], system?: string) {
  if (!DIRECT_KEY) throw new Error('VITE_ANTHROPIC_API_KEY가 설정되지 않았습니다.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DIRECT_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: system ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : undefined,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? 'Claude API 오류')
  }

  const json = await res.json()
  return json.content[0]?.text as string
}

// ─── OCR: 스마트워치 운동 기록 ───────────────────────────────────────────────────

export async function analyzeWorkoutImage(
  imageBase64: string,
  mimeType: string,
): Promise<WorkoutOCRResult> {
  if (!USE_DIRECT) {
    return callEdgeFunction<WorkoutOCRResult>('analyze-ocr', {
      type: 'workout',
      imageBase64,
      mimeType,
    })
  }

  const text = await callClaudeDirect(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `이 스마트워치/피트니스 앱 스크린샷에서 운동 데이터를 추출해주세요.
다음 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "type": "running|walking|cycling|swimming|other",
  "duration_seconds": number,
  "distance_km": number,
  "avg_pace_seconds": number,
  "max_pace_seconds": number,
  "avg_heart_rate": number,
  "max_heart_rate": number,
  "calories": number,
  "elevation_gain_m": number,
  "date": "YYYY-MM-DD or null",
  "confidence": 0.0~1.0,
  "raw_text": "인식된 원본 텍스트"
}
없는 필드는 null로 설정.`,
          },
        ],
      },
    ],
  )

  try {
    return JSON.parse(text) as WorkoutOCRResult
  } catch {
    return { confidence: 0, raw_text: text }
  }
}

// ─── OCR: 체중계 ────────────────────────────────────────────────────────────────

export async function analyzeWeightImage(
  imageBase64: string,
  mimeType: string,
): Promise<WeightOCRResult> {
  if (!USE_DIRECT) {
    return callEdgeFunction<WeightOCRResult>('analyze-ocr', {
      type: 'weight',
      imageBase64,
      mimeType,
    })
  }

  const text = await callClaudeDirect(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `이 체중계/스마트 체중계 스크린샷에서 데이터를 추출해주세요.
다음 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "weight_kg": number,
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "water_pct": number,
  "bmi": number,
  "date": "YYYY-MM-DD or null",
  "confidence": 0.0~1.0,
  "raw_text": "인식된 원본 텍스트"
}
lbs 단위는 kg으로 변환. 없는 필드는 null로.`,
          },
        ],
      },
    ],
  )

  try {
    return JSON.parse(text) as WeightOCRResult
  } catch {
    return { confidence: 0, raw_text: text }
  }
}

// ─── AI 헬스 코치 채팅 ───────────────────────────────────────────────────────────

export async function askHealthCoach(
  messages: CoachMessage[],
  context: WorkoutContext,
): Promise<string> {
  if (!USE_DIRECT) {
    return callEdgeFunction<string>('health-coach', { messages, context })
  }

  const { buildCoachSystemPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildCoachSystemPrompt(context)

  const apiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  return callClaudeDirect(apiMessages, systemPrompt)
}

// ─── 주간/월간 리포트 생성 ───────────────────────────────────────────────────────

export interface ReportInput {
  period: 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  context: WorkoutContext
}

export interface ReportOutput {
  summary: string
  highlights: string[]
  recommendations: string[]
  motivationalMessage: string
}

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  if (!USE_DIRECT) {
    return callEdgeFunction<ReportOutput>('generate-report', input)
  }

  const { buildReportPrompt } = await import('../services/claude-prompts')
  const { system, user } = buildReportPrompt(input.period, input.context)

  const text = await callClaudeDirect(
    [{ role: 'user', content: user }],
    system,
  )

  try {
    return JSON.parse(text) as ReportOutput
  } catch {
    return {
      summary: text,
      highlights: [],
      recommendations: [],
      motivationalMessage: '',
    }
  }
}

// ─── 통합 분석 ──────────────────────────────────────────────────────────────────

export async function generateIntegratedAnalysis(context: WorkoutContext): Promise<string> {
  if (!USE_DIRECT) {
    return callEdgeFunction<string>('generate-report', {
      period: 'integrated',
      context,
    })
  }

  const { buildIntegratedAnalysisPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildIntegratedAnalysisPrompt(context)

  return callClaudeDirect(
    [{ role: 'user', content: '운동과 체중 데이터를 통합 분석해서 인사이트를 제공해주세요.' }],
    systemPrompt,
  )
}
