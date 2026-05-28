-- ═══════════════════════════════════════════════════════════════════
-- FitAI Database Schema
-- ═══════════════════════════════════════════════════════════════════
-- 실행: Supabase Dashboard > SQL Editor 에 붙여넣기
-- 또는: supabase db push (Supabase CLI 사용 시)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Profiles ────────────────────────────────────────────────────────────────
-- auth.users를 확장하는 공개 프로필 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username        TEXT UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  height_cm       DECIMAL(5, 2),
  weight_goal_kg  DECIMAL(5, 2),
  birth_date      DATE,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS '사용자 프로필 (auth.users 확장)';

-- ─── 2. Workouts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workouts (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- 기본 정보
  type                TEXT DEFAULT 'running'
                        CHECK (type IN ('running', 'walking', 'cycling', 'swimming', 'other')) NOT NULL,
  date                DATE NOT NULL,

  -- 거리/시간
  duration_seconds    INTEGER CHECK (duration_seconds >= 0),
  distance_km         DECIMAL(8, 3) CHECK (distance_km >= 0),

  -- 페이스/속도 (초/km)
  avg_pace_seconds    INTEGER CHECK (avg_pace_seconds >= 0),
  max_pace_seconds    INTEGER CHECK (max_pace_seconds >= 0),

  -- 심박수
  avg_heart_rate      INTEGER CHECK (avg_heart_rate BETWEEN 30 AND 300),
  max_heart_rate      INTEGER CHECK (max_heart_rate BETWEEN 30 AND 300),

  -- 기타 지표
  calories            INTEGER CHECK (calories >= 0),
  elevation_gain_m    DECIMAL(8, 2),

  -- 메타데이터
  notes               TEXT,
  source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual', 'ocr', 'api')) NOT NULL,
  ocr_image_url       TEXT,
  raw_ocr_data        JSONB,

  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 복합 인덱스: 사용자별 날짜 기준 조회 최적화
  CONSTRAINT workouts_user_date_idx UNIQUE NULLS NOT DISTINCT (user_id, date, duration_seconds)
);

CREATE INDEX IF NOT EXISTS workouts_user_id_date_idx
  ON public.workouts (user_id, date DESC);

COMMENT ON TABLE public.workouts IS '운동 기록 (러닝, 걷기, 사이클 등)';
COMMENT ON COLUMN public.workouts.avg_pace_seconds IS '평균 페이스 (초/km). 5:30/km = 330';

-- ─── 3. Weight Records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_records (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- 날짜/체중 (필수)
  date             DATE NOT NULL,
  weight_kg        DECIMAL(5, 2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 500),

  -- 체성분 (선택)
  body_fat_pct     DECIMAL(5, 2) CHECK (body_fat_pct BETWEEN 0 AND 100),
  muscle_mass_kg   DECIMAL(5, 2) CHECK (muscle_mass_kg >= 0),
  water_pct        DECIMAL(5, 2) CHECK (water_pct BETWEEN 0 AND 100),
  bmi              DECIMAL(5, 2) CHECK (bmi BETWEEN 5 AND 100),

  -- 메타데이터
  notes            TEXT,
  source           TEXT DEFAULT 'manual'
                     CHECK (source IN ('manual', 'ocr', 'api')) NOT NULL,
  ocr_image_url    TEXT,
  raw_ocr_data     JSONB,

  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS weight_records_user_id_date_idx
  ON public.weight_records (user_id, date DESC);

COMMENT ON TABLE public.weight_records IS '체중 및 체성분 기록';

-- ─── 4. Goals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  type            TEXT NOT NULL
                    CHECK (type IN ('target_weight', 'weekly_distance', 'monthly_runs', 'pace', 'body_fat')),
  title           TEXT NOT NULL,
  target_value    DECIMAL(10, 2) NOT NULL,
  current_value   DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  unit            TEXT NOT NULL,
  deadline        DATE,
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'failed')) NOT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS goals_user_id_status_idx
  ON public.goals (user_id, status);

COMMENT ON TABLE public.goals IS '사용자 피트니스 목표';

-- ─── 5. Analysis Results ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  type            TEXT NOT NULL
                    CHECK (type IN ('weekly', 'monthly', 'integrated', 'workout', 'weight')),
  period_start    DATE,
  period_end      DATE,

  content         JSONB,          -- 집계 통계 데이터
  ai_summary      TEXT,           -- Claude 생성 요약
  recommendations JSONB,          -- 권고사항 배열

  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS analysis_results_user_id_type_idx
  ON public.analysis_results (user_id, type, created_at DESC);

COMMENT ON TABLE public.analysis_results IS 'AI 생성 분석 결과 캐시';

-- ─── 6. Coach Conversations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  messages        JSONB DEFAULT '[]' NOT NULL,  -- CoachMessage[] 배열
  context_type    TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 사용자당 활성 대화 1개만 (이후 대화는 새 레코드)
  UNIQUE (user_id, created_at)
);

COMMENT ON TABLE public.coach_conversations IS 'AI 코치 대화 기록';

-- ─── 7. Triggers ────────────────────────────────────────────────────────────────

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER coach_conversations_updated_at
  BEFORE UPDATE ON public.coach_conversations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
