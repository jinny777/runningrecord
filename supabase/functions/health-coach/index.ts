/**
 * Supabase Edge Function: health-coach
 *
 * 사용자의 운동/체중/목표 데이터를 컨텍스트로 주입하여
 * 개인화된 AI 헬스 코칭을 제공합니다.
 *
 * 배포: supabase functions deploy health-coach
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function buildSystemPrompt(context: Record<string, unknown>): string {
  const recentWorkouts = (context.recentWorkouts as any[]) ?? []
  const weightRecords = (context.weightRecords as any[]) ?? []
  const goals = (context.goals as any[]) ?? []
  const profile = (context.profile as Record<string, unknown>) ?? {}

  const workoutSummary = recentWorkouts.slice(0, 10).map((w: any) => {
    const parts = [`날짜: ${w.date}`, `타입: ${w.type}`]
    if (w.distance_km) parts.push(`거리: ${w.distance_km}km`)
    if (w.avg_pace_seconds) parts.push(`페이스: ${formatPace(w.avg_pace_seconds)}/km`)
    if (w.avg_heart_rate) parts.push(`심박: ${w.avg_heart_rate}bpm`)
    if (w.calories) parts.push(`칼로리: ${w.calories}kcal`)
    return parts.join(', ')
  }).join('\n') || '운동 기록 없음'

  const weightSummary = weightRecords.slice(0, 7).map((r: any) => {
    const parts = [`날짜: ${r.date}`, `체중: ${r.weight_kg}kg`]
    if (r.body_fat_pct) parts.push(`체지방: ${r.body_fat_pct}%`)
    if (r.muscle_mass_kg) parts.push(`근육: ${r.muscle_mass_kg}kg`)
    return parts.join(', ')
  }).join('\n') || '체중 기록 없음'

  const goalSummary = goals.map((g: any) =>
    `${g.title}: ${g.current_value}/${g.target_value} ${g.unit}`
  ).join('\n') || '목표 없음'

  return `당신은 FitAI의 엘리트 AI 헬스 코치입니다. 러닝과 체성분 최적화를 전문으로 합니다.

## 코치 원칙
- Nike Run Club 스타일의 동기부여적이고 데이터 기반 코칭
- 사용자의 실제 데이터를 반드시 인용하며 구체적으로 조언
- 과학적 근거 기반, 이해하기 쉬운 설명
- 직접적이고 실행 가능한 조언 우선
- 한국어로 자연스럽게 대화
- 의학적 진단 금지 (의사 상담 권유)

## 사용자 프로필
이름: ${profile.full_name ?? '러너'}
키: ${profile.height_cm ?? '미입력'}cm
성별: ${profile.gender ?? '미입력'}

## 최근 운동 기록
${workoutSummary}

## 체중 기록
${weightSummary}

## 활성 목표
${goalSummary}

## 오늘 날짜
${context.today ?? new Date().toISOString().split('T')[0]}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, context } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')

    const client = new Anthropic({ apiKey })

    const systemPrompt = buildSystemPrompt(context ?? {})

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },  // 컨텍스트 캐싱으로 비용 절감
        },
      ],
      messages: (messages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(JSON.stringify(reply), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[health-coach] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '서버 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
