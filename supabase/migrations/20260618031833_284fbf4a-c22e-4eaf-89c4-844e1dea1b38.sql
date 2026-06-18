CREATE TABLE public.att_weights (
  role text PRIMARY KEY,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.att_weights TO anon, authenticated;
GRANT ALL ON public.att_weights TO service_role;
ALTER TABLE public.att_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read att weights" ON public.att_weights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write att weights" ON public.att_weights FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update att weights" ON public.att_weights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete att weights" ON public.att_weights FOR DELETE TO anon, authenticated USING (true);