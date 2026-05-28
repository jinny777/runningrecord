-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════════
-- 각 사용자는 자신의 데이터만 CRUD 가능

-- ─── Enable RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── Workouts ────────────────────────────────────────────────────────────────────
CREATE POLICY "workouts: all own"
  ON public.workouts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Weight Records ──────────────────────────────────────────────────────────────
CREATE POLICY "weight_records: all own"
  ON public.weight_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Goals ───────────────────────────────────────────────────────────────────────
CREATE POLICY "goals: all own"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Analysis Results ────────────────────────────────────────────────────────────
CREATE POLICY "analysis_results: all own"
  ON public.analysis_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Coach Conversations ─────────────────────────────────────────────────────────
CREATE POLICY "coach_conversations: all own"
  ON public.coach_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Storage Buckets ─────────────────────────────────────────────────────────────
-- OCR 이미지 저장용 버킷 (Supabase Dashboard > Storage에서 생성 후 아래 실행)
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-images', 'ocr-images', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "ocr-images: users own folder"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'ocr-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'ocr-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
*/
