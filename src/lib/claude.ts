/**
 * AI 클라이언트 — Google Gemini (무료 티어)
 * 모델: gemini-1.5-flash (vision + text, 무료)
 * API 키: https://aistudio.google.com/apikey
 */

import { GoogleGenerativeAI, type Part } from '@google/generative-ai'
import type { WorkoutOCRResult, WeightOCRResult, CoachMessage } from '../types'
import type { WorkoutContext } from '../services/claude-prompts'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

function getClient() {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.')
  return new GoogleGenerativeAI(API_KEY)
}

async function generateText(prompt: string, system?: string): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: system,
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function generateWithImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  system?: string,
): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: system,
  })

  const parts: Part[] = [
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    { text: prompt },
  ]

  const result = await model.generateContent(parts)
  return result.response.text()
}

// ─── OCR: 스마트워치 운동 기록 ───────────────────────────────────────────────────

export async function analyzeWorkoutImage(
  imageBase64: string,
  mimeType: string,
): Promise<WorkoutOCRResult> {
  const text = await generateWithImage(
    imageBase64,
    mimeType,
    `이 스마트워치/피트니스 앱 스크린샷에서 운동 데이터를 추출해주세요.
JSON만 응답하세요 (마크다운 없이):
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
  "date": "YYYY-MM-DD 또는 null",
  "confidence": 0.0~1.0,
  "raw_text": "인식된 텍스트"
}
없는 필드는 null. 마일은 km으로 변환(×1.609). 페이스는 초/km.`,
    '스마트워치 운동 데이터 추출 전문가. JSON만 출력.',
  )

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as WorkoutOCRResult
  } catch {
    return { confidence: 0, raw_text: text }
  }
}

// ─── OCR: 체중계 ────────────────────────────────────────────────────────────────

export async function analyzeWeightImage(
  imageBase64: string,
  mimeType: string,
): Promise<WeightOCRResult> {
  const text = await generateWithImage(
    imageBase64,
    mimeType,
    `이 체중계 스크린샷에서 데이터를 추출해주세요.
JSON만 응답하세요 (마크다운 없이):
{
  "weight_kg": number,
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "water_pct": number,
  "bmi": number,
  "date": "YYYY-MM-DD 또는 null",
  "confidence": 0.0~1.0,
  "raw_text": "인식된 텍스트"
}
없는 필드는 null. 파운드는 kg으로 변환(×0.4536).`,
    '스마트 체중계 데이터 추출 전문가. JSON만 출력.',
  )

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as WeightOCRResult
  } catch {
    return { confidence: 0, raw_text: text }
  }
}

// ─── AI 헬스 코치 ────────────────────────────────────────────────────────────────

export async function askHealthCoach(
  messages: CoachMessage[],
  context: WorkoutContext,
): Promise<string> {
  const { buildCoachSystemPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildCoachSystemPrompt(context)

  const genAI = getClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  })

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1]
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMessage.content)
  return result.response.text()
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

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as ReportOutput
  } catch {
    return { summary: text, highlights: [], recommendations: [], motivationalMessage: '' }
  }
}

// ─── 통합 분석 ──────────────────────────────────────────────────────────────────

export async function generateIntegratedAnalysis(context: WorkoutContext): Promise<string> {
  const { buildIntegratedAnalysisPrompt } = await import('../services/claude-prompts')
  const systemPrompt = buildIntegratedAnalysisPrompt(context)

  return generateText(
    '운동과 체중 데이터를 통합 분석해서 인사이트를 제공해주세요.',
    systemPrompt,
  )
}
