-- Ejecutar en Neon (SQL Editor) si la tabla usuarios no tiene contraseña.
-- role_id: 1 = estudiante, 2 = profesor, 3 = administrador

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Ejemplo: tres usuarios de prueba (ajusta nombres a los que ya tengas)
-- INSERT INTO usuarios (nombre, role_id, password) VALUES
--   ('est1', 1, '123'),
--   ('prof1', 2, '123'),
--   ('admin1', 3, '123')
-- ON CONFLICT DO NOTHING;
