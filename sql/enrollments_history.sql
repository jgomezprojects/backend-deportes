-- Tabla de historial de matrícula (referencia alineada con el backend).
-- Si ya tienes enrollments_history con id, user_id, sport_id, date, reservation_id,
-- ejecuta enrollments_history_patch.sql para añadir action / notes / schedule_id.

CREATE TABLE IF NOT EXISTS enrollments_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    sport_id INTEGER REFERENCES sports (id),
    schedule_id INTEGER REFERENCES schedules (id),
    reservation_id INTEGER REFERENCES reservations (id),
    action VARCHAR(32) NOT NULL,
    notes TEXT,
    date DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_history_user ON enrollments_history (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_history_reservation ON enrollments_history (reservation_id);
