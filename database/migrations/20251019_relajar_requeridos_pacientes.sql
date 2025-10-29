-- Relajar requeridos en pacientes: permitir crear mínimos sin DNI ni fecha de nacimiento
ALTER TABLE pacientes ALTER COLUMN dni DROP NOT NULL;
ALTER TABLE pacientes ALTER COLUMN fecha_nacimiento DROP NOT NULL;