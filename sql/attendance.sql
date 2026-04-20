-- Asistencia por reserva (presente / ausente).
-- Ejecutar en Neon si aún no tienes la tabla o las columnas no coinciden con el backend.

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL REFERENCES schedules (id),
    status VARCHAR(20) NOT NULL,
    marked_by INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_reservation_id ON attendance (reservation_id);
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_id ON attendance (schedule_id);
