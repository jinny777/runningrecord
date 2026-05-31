/**
 * AI 클라이언트 — Google Gemini REST API (v1)
 * SDK 없이 fetch로 직접 호출 → 버전 문제 없음
 * 모델: gemini-1.5-flash (무료 티어)
 * API 키: https://aistudio.google.com/apikey
 */

import type { WorkoutOCRResult, WeightOCRResult, CoachMessage } from '../types'
import type { WorkoutContext } from '../services/claude-prompts'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-1.5-flash'

function getApiKey() {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.\nRender 환경변수에 VITE_GEMINI_API_KEY를 추가해주세요.')
  return API_KEY
}

// ─── 텍스트 생성 ─────────────────────────────────────────────────────────────────

async function generateText(userPrompt: string, systemPrompt?: string): Promise<string> {
  const key = getApiKey()
  const contents = []

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: `[시스템 지시사항]\n${systemPrompt}\n\n[사용자 메시지]\n${userPrompt}` }] })
  } else {
    contents.push({ role: 'user', parts: [{ text: userPrompt }] })
  }

  const res = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? `Gemini API 오류 (${res.status})`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── 이미지 + 텍스트 생성 ────────────────────────────────────────────────────────

async function generateWithImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const key = getApiKey()

  const textContent = systemPrompt
    ? `[시스템 지시사항]\n${systemPrompt}\n\n[사용자 메시지]\n${prompt}`
    : prompt

  const res = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: textContent },
        ],
      }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? `Gemini API 오류 (${res.status})`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned) as T
}

// ─── OCR: 스마트워치 운동 기록 ───────────────────────────────────────────────────

export async function analyzeWorkoutImage(
  imageBase64: string,
  mimeType: string,
): Promise<WorkoutOCRResult> {
  const text = await generateWithImage(
    imageBase64, mimeType,
    `이 스마트워치/피트니스 앱 스크린샷에서 운동 데이터를 추출하세요.
JSON만 응답 (마크다운 없이):
{"type":"running|walking|cycling|swimming|other","duration_seconds":number,"distance_km":number,"avg_pace_seconds":number,"max_pace_seconds":number,"avg_heart_rate":number,"max_heart_rate":number,"calories":number,"elevation_gain_m":number,"date":"YYYY-MM-DD","confidence":0.0~1.0,"raw_text":"인식된 텍스트"}
없는 필드는 null. 마일→km(×1.609). 페이스→초/km.`,
    '스마트워치 데이터 추출 전문가. JSON만 출력.',
  )
  try { return parseJSON<WorkoutOCRResult>(text) }
  catch { return { confidence: 0, raw_text: text } }
}

// ─── OCR: 체중계 ────────────────────────────────────────────────────────────────

export async function analyzeWeightImage(
  imageBase64: string,
  mimeType: string,
): Promise<WeightOCRResult> {
  const text = await generateWithImage(
    imageBase64, mimeType,
    `이 체중계 스크린샷에서 데이터를 추출하세요.
JSON만 응답 (마크다운 없이):
{"weight_kg":number,"body_fat_pct":number,"muscle_mass_kg":number,"water_pct":number,"bmi":number,"date":"YYYY-MM-DD","confidence":0.0~1.0,"raw_text":"인식된 텍스트"}
없는 필드는 null. 파운드→kg(×0.4536).`,
    '체중계 데이터 추출 전문가. JSON만 출력.',
  )
  try { return parseJSON<WeightOCRResult>(text) }
  catch { return { confidence: 0, raw_text: text } }
}

// ─── 이미지 텍스트 추출 + 분석 ──────────────────────────────────────────────────

export interface ImageAnalysisResult {
  extractedText: string
  analysis: string
  dataType: string
  structuredData?: Record<string, unknown>
}

export async function analyzeImageText(
  imageBase64: string,
  mimeType: string,
  userQuestion?: string,
): Promise<ImageAnalysisResult> {
  const text = await generateWithImage(
    imageBase64, mimeType,
    `이미지에서 모든 텍스트를 추출하고 분석하세요.
JSON만 응답 (마크다운 없이):
{"extractedText":"추출된 텍스트 원본","dataType":"운동기록|체중계|식단|검진결과|처방전|기타","analysis":"건강 관점 분석 2-4문장(한국어)","structuredData":{}}
${userQuestion ? `특별 분석 요청: ${userQuestion}` : ''}`,
    '건강 데이터 분석 전문가. JSON만 출력.',
  )
  try { return parseJSON<ImageAnalysisResult>(text) }
  catch { return { extractedText: text, analysis: text, dataType: '기타' } }
}

// ─── AI 헬스 코치 ────────────────────────────────────────────────────────────────

export async function askHealthCoach(
  messages: CoachMessage[],
  context: WorkoutContext,
): Promise<string> {
  const { buildCoachSystemPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildCoachSystemPrompt(context)

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))
  const last = messages[messages.length - 1]

  const key = getApiKey()
  const res = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...history,
        { role: 'user', parts: [{ text: last.content }] },
      ],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.8 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? `Gemini API 오류 (${res.status})`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── 리포트 생성 ─────────────────────────────────────────────────────────────────

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
  const { buildReportPrompt } = await import('../services/claude-prompts')
  const { system, user } = buildReportPrompt(input.period, input.context)
  const text = await generateText(user, system)
  try { return parseJSON<ReportOutput>(text) }
  catch { return { summary: text, highlights: [], recommendations: [], motivationalMessage: '' } }
}

// ─── 통합 분석 ──────────────────────────────────────────────────────────────────

export async function generateIntegratedAnalysis(context: WorkoutContext): Promise<string> {
  const { buildIntegratedAnalysisPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildIntegratedAnalysisPrompt(context)
  return generateText('운동과 체중 데이터를 통합 분석해서 인사이트를 제공해주세요.', systemPrompt)
}
