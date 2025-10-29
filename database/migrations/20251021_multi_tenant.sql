-- Migración: multi-tenancy por usuario (id_usuario en pacientes, consultas y turnos)
-- Fecha: 2025-10-21

BEGIN;

-- 1) Agregar columnas id_usuario (permitir NULL temporalmente)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS id_usuario INTEGER;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS id_usuario INTEGER;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS id_usuario INTEGER;

-- 2) Backfill: tomar el id del doctor por defecto, o admin, o el menor id disponible
DO $$
DECLARE
  v_owner INT;
BEGIN
  SELECT id_usuario INTO v_owner FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1;
  IF v_owner IS NULL THEN
    SELECT id_usuario INTO v_owner FROM usuarios WHERE email='admin@clinica.com' LIMIT 1;
  END IF;
  IF v_owner IS NULL THEN
    SELECT MIN(id_usuario) INTO v_owner FROM usuarios;
  END IF;

  IF v_owner IS NOT NULL THEN
    UPDATE pacientes SET id_usuario = v_owner WHERE id_usuario IS NULL;
    UPDATE consultas SET id_usuario = v_owner WHERE id_usuario IS NULL;
    UPDATE turnos SET id_usuario = v_owner WHERE id_usuario IS NULL;
  END IF;
END $$;

-- 3) Constraints y FKs
ALTER TABLE pacientes
  ADD CONSTRAINT fk_pacientes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE consultas
  ADD CONSTRAINT fk_consultas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE turnos
  ADD CONSTRAINT fk_turnos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE;

-- Unicidad DNI por usuario y no global
DO $$ BEGIN
  -- Eliminar unique global si existiera
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'pacientes_dni_key'
  ) THEN
    -- índice creado por constraint UNIQUE automático
    -- Intentar soltar constraint si existe con ese nombre
    BEGIN
      ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_dni_key;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- Crear índice único compuesto (ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pacientes_usuario_dni ON pacientes(id_usuario, dni) WHERE dni IS NOT NULL;

-- 4) Not Null finales
ALTER TABLE pacientes ALTER COLUMN id_usuario SET NOT NULL;
ALTER TABLE consultas ALTER COLUMN id_usuario SET NOT NULL;
ALTER TABLE turnos ALTER COLUMN id_usuario SET NOT NULL;

-- 5) Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario ON pacientes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_consultas_usuario ON consultas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_turnos_usuario ON turnos(id_usuario);

COMMIT;
