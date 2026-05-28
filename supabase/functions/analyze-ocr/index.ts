/**
 * Supabase Edge Function: analyze-ocr
 *
 * Claude Vision API를 사용해 스마트워치/체중계 이미지에서
 * 운동/체중 데이터를 추출합니다.
 *
 * 배포: supabase functions deploy analyze-ocr
 * 환경변수: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OCRRequest {
  type: 'workout' | 'weight'
  imageBase64: string
  mimeType: string
}

const WORKOUT_PROMPT = `이 스마트워치/피트니스 앱 스크린샷에서 운동 데이터를 추출해주세요.
다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
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
  "raw_text": "이미지에서 인식된 주요 텍스트"
}
규칙:
- 마일 → km 변환 (×1.609)
- 시간은 초 단위로 변환
- 페이스는 초/km (예: 5:30/km = 330)
- 없거나 불명확한 필드는 null`

const WEIGHT_PROMPT = `이 체중계/스마트 체중계 스크린샷에서 데이터를 추출해주세요.
다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "weight_kg": number,
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "water_pct": number,
  "bmi": number,
  "date": "YYYY-MM-DD 또는 null",
  "confidence": 0.0~1.0,
  "raw_text": "이미지에서 인식된 주요 텍스트"
}
규칙:
- 파운드 → kg 변환 (×0.453592)
- 없거나 불명확한 필드는 null`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, imageBase64, mimeType }: OCRRequest = await req.json()

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'imageBase64와 mimeType이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.')

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: type === 'workout'
            ? '당신은 스마트워치 운동 데이터 추출 전문가입니다. JSON만 출력하세요.'
            : '당신은 스마트 체중계 데이터 추출 전문가입니다. JSON만 출력하세요.',
          cache_control: { type: 'ephemeral' },  // 프롬프트 캐싱 활성화
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: type === 'workout' ? WORKOUT_PROMPT : WEIGHT_PROMPT,
            },
          ],
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let result
    try {
      // JSON 파싱 — 마크다운 코드블록 제거 후 시도
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = { confidence: 0, raw_text: rawText }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[analyze-ocr] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '서버 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
