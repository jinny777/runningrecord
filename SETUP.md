# FitAI — 시작 가이드

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 18 + TypeScript + Vite |
| 스타일링 | TailwindCSS v3 (다크모드 기본) |
| 상태관리 | Zustand (persist 미들웨어) |
| 차트 | Recharts |
| 백엔드/DB | Supabase (PostgreSQL + RLS) |
| AI | Claude claude-sonnet-4-6 (Anthropic SDK) |
| OCR | Claude Vision API |
| 인증 | Supabase Auth |

---

## 1. Supabase 프로젝트 설정

```bash
# 1) https://supabase.com 에서 새 프로젝트 생성
# 2) SQL Editor에서 아래 파일 순서대로 실행:
supabase/migrations/001_schema.sql
supabase/migrations/002_rls_policies.sql
```

---

## 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일에서:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 개발 모드 (Edge Function 없이 Claude 직접 호출)
```env
VITE_USE_DIRECT_CLAUDE=true
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> ⚠️ 프로덕션에서는 절대 API 키를 프론트엔드에 노출하지 마세요.

---

## 3. 로컬 실행

```bash
npm install
npm run dev
```

---

## 4. Supabase Edge Functions 배포 (프로덕션)

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# API 키 설정 (프론트엔드에 노출 안 됨)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Edge Functions 배포
supabase functions deploy analyze-ocr
supabase functions deploy health-coach
supabase functions deploy generate-report
```

Edge Functions 배포 후 `.env`에서:
```env
VITE_USE_DIRECT_CLAUDE=false
```

---

## 5. Storage 버킷 설정 (OCR 이미지 저장)

Supabase Dashboard > Storage > New Bucket:
- Name: `ocr-images`
- Public: `false` (비공개)

그 다음 `002_rls_policies.sql`의 주석 처리된 Storage 정책 실행.

---

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  React Web App                   │
│  Dashboard │ Workout │ Weight │ Analysis         │
│  Goals     │ Reports │ AI Coach                 │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼──────────┐
│   Supabase   │   │  Edge Functions   │
│  PostgreSQL  │   │  ┌─ analyze-ocr   │
│  + Auth      │   │  ├─ health-coach  │
│  + Storage   │   │  └─ gen-report    │
└──────────────┘   └────────┬──────────┘
                            │
                   ┌────────▼──────────┐
                   │  Anthropic API    │
                   │  claude-sonnet-4-6│
                   │  + Vision OCR     │
                   │  + Prompt Cache   │
                   └───────────────────┘
```

---

## Claude 프롬프트 캐싱 비용 최적화

Edge Functions에서 `cache_control: { type: 'ephemeral' }` 적용:
- 시스템 프롬프트 (컨텍스트 포함) 캐싱
- 캐시 히트 시 입력 토큰 비용 **90% 절감**
- TTL: 5분 (ephemeral cache)

---

## 주요 파일 구조

```
fitness-ai/
├── src/
│   ├── types/index.ts          # TypeScript 타입 정의
│   ├── lib/
│   │   ├── supabase.ts         # Supabase 클라이언트 + API
│   │   └── claude.ts           # Claude API 클라이언트
│   ├── store/useAppStore.ts    # Zustand 전역 상태
│   ├── services/
│   │   ├── claude-prompts.ts   # 프롬프트 구조
│   │   └── analysis.ts         # 통계 알고리즘
│   ├── utils/
│   │   ├── formatters.ts       # 포맷터 유틸
│   │   └── toast.ts            # 토스트 알림
│   ├── components/
│   │   ├── layout/             # Sidebar, Layout
│   │   ├── common/             # OCRUploader, MetricCard
│   │   ├── workout/            # WorkoutForm, WorkoutCard
│   │   └── weight/             # WeightForm, WeightChart
│   └── pages/
│       ├── Auth.tsx            # 로그인/회원가입
│       ├── Dashboard.tsx       # 홈 대시보드
│       ├── Workout.tsx         # 운동 기록 + OCR
│       ├── Weight.tsx          # 체중 관리 + OCR
│       ├── Analysis.tsx        # 통합 분석
│       ├── Goals.tsx           # 목표 관리
│       ├── Reports.tsx         # 주간/월간 리포트
│       └── Coach.tsx           # AI 코치 채팅
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql      # DB 스키마
│   │   └── 002_rls_policies.sql # RLS 정책
│   └── functions/
│       ├── analyze-ocr/        # Vision OCR
│       ├── health-coach/       # AI 코치
│       └── generate-report/    # 리포트 생성
└── SETUP.md
```
