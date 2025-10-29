-- Agregar columna de teléfono adicional a pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS telefono_adicional VARCHAR(20);
