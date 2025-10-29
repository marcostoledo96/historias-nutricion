-- Migración: Agregar campos clínicos al perfil del paciente
ALTER TABLE pacientes
  ADD COLUMN pa TEXT,
  ADD COLUMN pmin TEXT,
  ADD COLUMN pmax TEXT,
  ADD COLUMN imc TEXT,
  ADD COLUMN t TEXT,
  ADD COLUMN pposible TEXT,
  ADD COLUMN medicacion TEXT,
  ADD COLUMN ejercicio_fisico TEXT;

-- Para revertir:
-- ALTER TABLE pacientes
--   DROP COLUMN pa,
--   DROP COLUMN pmin,
--   DROP COLUMN pmax,
--   DROP COLUMN imc,
--   DROP COLUMN t,
--   DROP COLUMN pposible,
--   DROP COLUMN medicacion,
--   DROP COLUMN ejercicio_fisico;
