-- Alinea enrollments_history con el backend (acción de historial y horario).
-- Ejecutar en Neon si tu tabla solo tenía user_id, sport_id, date, reservation_id.

ALTER TABLE enrollments_history ADD COLUMN IF NOT EXISTS action VARCHAR(32);
ALTER TABLE enrollments_history ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE enrollments_history ADD COLUMN IF NOT EXISTS schedule_id INTEGER;

UPDATE enrollments_history SET action = 'LEGACY' WHERE action IS NULL;
