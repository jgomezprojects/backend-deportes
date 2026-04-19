-- Neon: profesor asignado a cada horario (schedules).
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES usuarios (id);
