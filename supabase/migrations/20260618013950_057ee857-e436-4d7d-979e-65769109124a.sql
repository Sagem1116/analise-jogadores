CREATE TABLE public.role_weights (
  role text PRIMARY KEY,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_weights TO anon, authenticated;
GRANT ALL ON public.role_weights TO service_role;
ALTER TABLE public.role_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read role weights" ON public.role_weights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write role weights" ON public.role_weights FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update role weights" ON public.role_weights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete role weights" ON public.role_weights FOR DELETE TO anon, authenticated USING (true);