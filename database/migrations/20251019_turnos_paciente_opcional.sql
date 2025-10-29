-- Hacer opcional la relación con pacientes y permitir datos temporales del paciente en turnos
ALTER TABLE turnos
    ALTER COLUMN id_paciente DROP NOT NULL;

-- Agregar columnas temporales para almacenar nombre/apellido cuando no existe perfil
ALTER TABLE turnos
    ADD COLUMN IF NOT EXISTS paciente_nombre_tmp VARCHAR(120),
    ADD COLUMN IF NOT EXISTS paciente_apellido_tmp VARCHAR(120);

-- Nota: La FK existente permite valores NULL, no requiere cambios adicionales.