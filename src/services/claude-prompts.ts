/**
 * Claude 프롬프트 구조
 *
 * 설계 원칙:
 * 1. 시스템 프롬프트에 prompt-caching 적용 → 비용 최대 90% 절감
 * 2. 사용자 데이터를 컨텍스트로 주입 (RAG 패턴)
 * 3. 구조화된 JSON 응답 요구
 * 4. 한국어 기반 응답
 */

import type { Workout, WeightRecord, Goal } from '../types'
import { formatPace, formatDuration, formatDate } from '../utils/formatters'

// ─── Context Builder ─────────────────────────────────────────────────────────────

export interface WorkoutContext {
  recentWorkouts: Workout[]
  weightRecords: WeightRecord[]
  goals: Goal[]
  profile?: {
    full_name?: string
    height_cm?: number
    gender?: string
    birth_date?: string
  }
  today?: string
}

export function buildContextSummary(ctx: WorkoutContext): string {
  const { recentWorkouts, weightRecords, goals, profile } = ctx

  const workoutSummary = recentWorkouts.slice(0, 10).map(w => {
    const parts = [`날짜: ${formatDate(w.date)}`, `타입: ${w.type}`]
    if (w.distance_km) parts.push(`거리: ${w.distance_km}km`)
    if (w.duration_seconds) parts.push(`시간: ${formatDuration(w.duration_seconds)}`)
    if (w.avg_pace_seconds) parts.push(`평균 페이스: ${formatPace(w.avg_pace_seconds)}/km`)
    if (w.avg_heart_rate) parts.push(`평균 심박수: ${w.avg_heart_rate}bpm`)
    if (w.calories) parts.push(`칼로리: ${w.calories}kcal`)
    return parts.join(', ')
  }).join('\n')

  const weightSummary = weightRecords.slice(0, 7).map(r => {
    const parts = [`날짜: ${formatDate(r.date)}`, `체중: ${r.weight_kg}kg`]
    if (r.body_fat_pct) parts.push(`체지방: ${r.body_fat_pct}%`)
    if (r.muscle_mass_kg) parts.push(`근육량: ${r.muscle_mass_kg}kg`)
    if (r.bmi) parts.push(`BMI: ${r.bmi}`)
    return parts.join(', ')
  }).join('\n')

  const goalSummary = goals
    .filter(g => g.status === 'active')
    .map(g => `${g.title}: ${g.current_value}/${g.target_value} ${g.unit}`)
    .join('\n')

  const profileInfo = profile
    ? `이름: ${profile.full_name ?? '사용자'}, 키: ${profile.height_cm ?? '미입력'}cm`
    : '프로필 미입력'

  return `
## 사용자 프로필
${profileInfo}

## 최근 운동 기록 (최근 10개)
${workoutSummary || '운동 기록 없음'}

## 체중 기록 (최근 7일)
${weightSummary || '체중 기록 없음'}

## 활성 목표
${goalSummary || '설정된 목표 없음'}
`.trim()
}

// ─── AI 헬스 코치 시스템 프롬프트 ───────────────────────────────────────────────

export function buildCoachSystemPrompt(ctx: WorkoutContext): string {
  const contextSummary = buildContextSummary(ctx)

  return `당신은 FitAI의 엘리트 AI 헬스 코치입니다. 러닝과 체성분 최적화를 전문으로 합니다.

## 코치 역할
- Nike Run Club의 코치처럼 동기부여적이고 데이터 기반으로 조언합니다
- 사용자의 실제 데이터를 반드시 참조하여 구체적인 답변을 제공합니다
- 과학적 근거를 바탕으로 하되, 이해하기 쉽게 설명합니다
- 단기적 동기부여와 장기적 습관 형성을 모두 고려합니다

## 커뮤니케이션 스타일
- 직접적이고 실행 가능한 조언 위주
- 데이터 포인트를 구체적으로 언급 ("지난 주 평균 페이스 5:30/km에서...")
- 격려하되 현실적인 목표 제시
- 한국어로 자연스럽게 대화

## 사용자 현재 데이터
${contextSummary}

## 응답 지침
- 200자 이내의 간결한 답변 우선
- 복잡한 분석 시 구조화된 포맷 사용
- 의학적 진단은 하지 않음 (의사 상담 권유)
- 오늘 날짜: ${ctx.today ?? new Date().toISOString().split('T')[0]}`
}

// ─── 주간/월간 리포트 프롬프트 ──────────────────────────────────────────────────

export function buildReportPrompt(
  period: 'weekly' | 'monthly',
  ctx: WorkoutContext,
): { system: string; user: string } {
  const contextSummary = buildContextSummary(ctx)
  const periodLabel = period === 'weekly' ? '주간' : '월간'

  const system = `당신은 전문 러닝 코치이자 데이터 분석가입니다.
사용자의 ${periodLabel} 운동 데이터를 분석하여 통찰력 있는 리포트를 작성합니다.

## 사용자 데이터
${contextSummary}`

  const user = `위 데이터를 바탕으로 ${periodLabel} 리포트를 작성해주세요.
다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "summary": "전체 ${periodLabel} 요약 (2-3문장)",
  "highlights": ["하이라이트1", "하이라이트2", "하이라이트3"],
  "recommendations": ["권고사항1", "권고사항2", "권고사항3"],
  "motivationalMessage": "동기부여 메시지 (1문장, 이름 포함)"
}`

  return { system, user }
}

// ─── 통합 분석 프롬프트 ──────────────────────────────────────────────────────────

export function buildIntegratedAnalysisPrompt(ctx: WorkoutContext): string {
  const contextSummary = buildContextSummary(ctx)

  return `당신은 운동생리학과 영양학을 결합한 통합 건강 분석 전문가입니다.

## 분석 목표
운동 데이터와 체중/체성분 데이터의 상관관계를 분석하여:
1. 운동이 체성분 변화에 미치는 영향 파악
2. 최적의 운동-식이 전략 도출
3. 목표 달성을 위한 구체적 행동 계획 수립

## 사용자 데이터
${contextSummary}

## 응답 형식
- 핵심 인사이트 3가지
- 체성분 변화 트렌드 분석
- 운동 강도와 체중 변화의 상관관계
- 다음 4주 액션 플랜
- 주의사항 (있는 경우)

한국어로 명확하고 실용적으로 작성.`
}

// ─── OCR 데이터 보정 프롬프트 ────────────────────────────────────────────────────

export const OCR_WORKOUT_SYSTEM = `당신은 스마트워치 및 피트니스 앱 데이터 추출 전문가입니다.
이미지에서 운동 데이터를 정확하게 추출하고 표준 단위로 변환합니다.

규칙:
- 거리: km 단위로 통일 (마일 → km 변환: ×1.609)
- 시간: 초 단위로 변환
- 페이스: 초/km 단위로 변환 (예: 5:30/km → 330초/km)
- 심박수: bpm 단위
- 칼로리: kcal 단위
- 날짜가 보이면 YYYY-MM-DD 형식으로 추출
- 확신도(confidence): 0.0~1.0 (데이터 명확도 기준)
- 보이지 않는 필드는 null`

export const OCR_WEIGHT_SYSTEM = `당신은 스마트 체중계 데이터 추출 전문가입니다.
이미지에서 체성분 데이터를 정확하게 추출하고 표준 단위로 변환합니다.

규칙:
- 체중: kg 단위로 통일 (파운드 → kg 변환: ×0.453592)
- 체지방률: % 단위
- 근육량: kg 단위
- 수분율: % 단위
- BMI: 소수점 1자리
- 날짜가 보이면 YYYY-MM-DD 형식으로 추출
- 확신도(confidence): 0.0~1.0
- 보이지 않는 필드는 null`

// ─── 빠른 질문 제안 ─────────────────────────────────────────────────────────────

export const QUICK_QUESTIONS = [
  '이번 주 운동 어떻게 됐어?',
  '내 페이스 개선 방법 알려줘',
  '체중 감량 vs 근육 증가, 지금 어떻게 해야 해?',
  '오늘 회복 운동 해야 할까?',
  '다음 10km 레이스 페이스 전략 짜줘',
  '심박수 Zone 2 훈련 설명해줘',
  '이번 달 목표 달성 가능할까?',
  '러닝 후 최적의 음식은?',
]
