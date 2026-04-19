-- Esquema esperado por el backend para calificaciones (ajusta si ya existe distinto).
-- Columna numérica: rating (p. ej. 0–10 o 0–5).

CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
    rating NUMERIC(4, 2) NOT NULL,
    comment TEXT
);

-- Si la tabla ya existe pero la columna se llama score:
-- ALTER TABLE ratings RENAME COLUMN score TO rating;
