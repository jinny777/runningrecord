/**
 * Supabase Edge Function: generate-report
 *
 * 주간/월간 리포트 및 통합 분석을 생성합니다.
 * Prompt Caching으로 반복 호출 비용을 최소화합니다.
 *
 * 배포: supabase functions deploy generate-report
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildContextSummary(ctx: Record<string, unknown>): string {
  const workouts = (ctx.recentWorkouts as any[]) ?? []
  const weights = (ctx.weightRecords as any[]) ?? []
  const goals = (ctx.goals as any[]) ?? []

  const wStats = {
    count: workouts.length,
    totalKm: workouts.reduce((s: number, w: any) => s + (w.distance_km ?? 0), 0).toFixed(1),
    totalCal: workouts.reduce((s: number, w: any) => s + (w.calories ?? 0), 0),
    avgHR: workouts.filter((w: any) => w.avg_heart_rate).length > 0
      ? Math.round(workouts.filter((w: any) => w.avg_heart_rate)
          .reduce((s: number, w: any) => s + w.avg_heart_rate, 0) /
          workouts.filter((w: any) => w.avg_heart_rate).length)
      : null,
  }

  const latestWeight = weights[0]
  const prevWeight = weights[weights.length - 1]
  const weightChange = latestWeight && prevWeight && latestWeight !== prevWeight
    ? ((latestWeight.weight_kg - prevWeight.weight_kg) as number).toFixed(1)
    : null

  return `
운동 통계:
- 총 운동: ${wStats.count}회
- 총 거리: ${wStats.totalKm}km
- 총 칼로리: ${wStats.totalCal}kcal
${wStats.avgHR ? `- 평균 심박: ${wStats.avgHR}bpm` : ''}

체중:
- 최근 체중: ${latestWeight?.weight_kg ?? '없음'}kg
- 체지방: ${latestWeight?.body_fat_pct ?? '없음'}%
${weightChange ? `- 기간 변화: ${+weightChange > 0 ? '+' : ''}${weightChange}kg` : ''}

목표:
${goals.map((g: any) => `- ${g.title}: ${g.current_value}/${g.target_value} ${g.unit}`).join('\n') || '없음'}
`.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { period, periodStart, periodEnd, context } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')

    const client = new Anthropic({ apiKey })
    const contextSummary = buildContextSummary(context ?? {})
    const periodLabel = period === 'weekly' ? '주간' : period === 'monthly' ? '월간' : '통합'
    const profileName = (context?.profile as any)?.full_name ?? '러너'

    if (period === 'integrated') {
      // 통합 분석 — 일반 텍스트 응답
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: [
          {
            type: 'text',
            text: `당신은 운동생리학과 영양학을 결합한 통합 건강 분석 전문가입니다.
운동 데이터와 체중/체성분 데이터의 상관관계를 분석하여 실용적인 인사이트를 제공합니다.
한국어로 명확하고 실용적으로 작성. 마크다운 허용.`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `다음 데이터를 통합 분석해주세요:\n\n${contextSummary}\n\n핵심 인사이트 3가지, 체성분 변화 트렌드, 운동-체중 상관관계, 4주 액션플랜을 포함해주세요.`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return new Response(JSON.stringify(text), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 주간/월간 리포트 — 구조화된 JSON 응답
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: [
        {
          type: 'text',
          text: `당신은 전문 러닝 코치이자 데이터 분석가입니다.
사용자의 ${periodLabel} 운동/체중 데이터를 분석하여 통찰력 있는 리포트를 작성합니다.
JSON 형식으로만 응답하세요 (마크다운 코드블록 없이).`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `기간: ${periodStart} ~ ${periodEnd}

${contextSummary}

위 데이터를 바탕으로 ${periodLabel} 리포트를 다음 JSON 형식으로 작성해주세요:
{
  "summary": "${periodLabel} 요약 (2-3문장)",
  "highlights": ["하이라이트1", "하이라이트2", "하이라이트3"],
  "recommendations": ["권고사항1", "권고사항2", "권고사항3"],
  "motivationalMessage": "${profileName}님을 위한 동기부여 메시지 (1문장)"
}`,
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'

    let result
    try {
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = {
        summary: rawText,
        highlights: [],
        recommendations: [],
        motivationalMessage: '',
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-report] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '서버 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
