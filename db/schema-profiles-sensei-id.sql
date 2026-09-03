-- ANS V3 — tautkan akun login Sensei ke master sensei
-- Jalankan di SQL Editor project V3 (staging/production schema sudah ada).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_sensei ON profiles(sensei_id);

-- Link Sensei: prefer profiles.sensei_id, fallback cocokkan email Auth ↔ sensei.email
CREATE OR REPLACE FUNCTION public.current_sensei_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.sensei_id
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'Approved'
        AND p.sensei_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT s.id
      FROM sensei s
      WHERE lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      LIMIT 1
    )
  )
$$;

-- Opsional: isi sensei_id otomatis dari email yang sudah cocok
UPDATE profiles p
SET sensei_id = s.id
FROM sensei s
WHERE p.sensei_id IS NULL
  AND p.role = 'Sensei'
  AND lower(coalesce(p.email, '')) = lower(coalesce(s.email, ''))
  AND coalesce(s.email, '') <> '';
