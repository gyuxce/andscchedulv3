-- ANS Dashboard V3 — additive: izinkan timezone Sensei di Jepang (JST / Asia/Tokyo)
-- Beberapa Sensei mengajar dari Jepang. Tanpa ini, jam mulai kelas & deteksi
-- terlambat dihitung dengan jam Indonesia.
-- Aman dijalankan berulang.

ALTER TABLE sensei DROP CONSTRAINT IF EXISTS sensei_timezone_check;
ALTER TABLE sensei ADD CONSTRAINT sensei_timezone_check
  CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Tokyo'));
