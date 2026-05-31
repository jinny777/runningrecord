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
    model: 'gemini-1.5-flash-latest',
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
    model: 'gemini-1.5-flash-latest',
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
    model: 'gemini-1.5-flash-latest',
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

// ─── 범용 이미지 텍스트 추출 + 분석 ─────────────────────────────────────────────

export interface ImageAnalysisResult {
  extractedText: string       // 이미지에서 추출한 원본 텍스트
  analysis: string            // AI 분석 결과
  dataType: string            // 감지된 데이터 유형
  structuredData?: Record<string, unknown>  // 구조화된 데이터 (가능한 경우)
}

export async function analyzeImageText(
  imageBase64: string,
  mimeType: string,
  userQuestion?: string,
): Promise<ImageAnalysisResult> {
  const prompt = `이미지에서 모든 텍스트를 추출하고 분석해주세요.

다음 JSON 형식으로 응답하세요 (마크다운 없이):
{
  "extractedText": "이미지에서 추출한 모든 텍스트 (원본 그대로)",
  "dataType": "감지된 데이터 유형 (예: 운동기록, 체중계, 식단, 검진결과, 처방전, 기타)",
  "analysis": "추출된 텍스트를 기반으로 한 건강/피트니스 관점의 분석 (한국어, 2-4문장)",
  "structuredData": {
    // 감지된 데이터가 있으면 구조화 (숫자, 날짜 등)
  }
}

${userQuestion ? `특별히 분석해줄 내용: ${userQuestion}` : '건강 및 피트니스 관련 인사이트를 제공해주세요.'}`

  const text = await generateWithImage(
    imageBase64,
    mimeType,
    prompt,
    '당신은 건강 데이터 분석 전문가입니다. 이미지의 텍스트를 정확히 추출하고 건강 관점에서 분석합니다. JSON만 출력.',
  )

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as ImageAnalysisResult
  } catch {
    return {
      extractedText: text,
      analysis: text,
      dataType: '기타',
    }
  }
}
