-- Scripts SQL para Sistema de Historias Clínicas Médicas
-- Tecnologías: PostgreSQL, Node.js, Express
-- Autor: Marcos Toledo

-- Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE historias_clinicas;

-- Conectar a la base de datos antes de ejecutar los siguientes scripts
-- \c historias_clinicas;

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS consultas CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Crear tabla usuarios
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'doctor',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true
);

-- Crear tabla pacientes
CREATE TABLE pacientes (
    id_paciente SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20),
    fecha_nacimiento DATE,
    sexo VARCHAR(10) CHECK (sexo IN ('masculino', 'femenino', 'otro')),
    telefono VARCHAR(20),
    telefono_adicional VARCHAR(20),
    email VARCHAR(100),
    cobertura VARCHAR(100),
    plan VARCHAR(100),
    numero_afiliado VARCHAR(50),
    localidad VARCHAR(100),
    direccion TEXT,
    ocupacion VARCHAR(100),
    enfermedades_preexistentes TEXT,
    alergias TEXT,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    pa TEXT,
    pmin TEXT,
    pmax TEXT,
    imc TEXT,
    t TEXT,
    pposible TEXT,
    medicacion TEXT,
    ejercicio_fisico TEXT
);

-- Crear tabla consultas
CREATE TABLE consultas (
    id_consulta SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    motivo_consulta TEXT NOT NULL,
    informe_medico TEXT,
    diagnostico TEXT,
    tratamiento TEXT,
    estudios TEXT,
    archivo_adjunto VARCHAR(255), -- Para imágenes o documentos
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla turnos
CREATE TABLE turnos (
    id_turno SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_paciente INTEGER REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
    id_consulta INTEGER REFERENCES consultas(id_consulta) ON DELETE SET NULL,
    dia DATE NOT NULL,
    horario TIME NOT NULL,
    cobertura VARCHAR(100),
    hora_llegada TIME,
    situacion VARCHAR(20) DEFAULT 'programado' CHECK (situacion IN ('programado', 'en_espera', 'atendido', 'ausente', 'cancelado')),
    detalle TEXT,
    primera_vez BOOLEAN DEFAULT false,
    paciente_nombre_tmp VARCHAR(120),
    paciente_apellido_tmp VARCHAR(120),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
-- Unicidad por usuario + DNI
CREATE UNIQUE INDEX IF NOT EXISTS ux_pacientes_usuario_dni ON pacientes(id_usuario, dni) WHERE dni IS NOT NULL;
CREATE INDEX idx_pacientes_dni ON pacientes(dni);
CREATE INDEX idx_pacientes_nombre_apellido ON pacientes(nombre, apellido);
CREATE INDEX idx_pacientes_usuario ON pacientes(id_usuario);
CREATE INDEX idx_consultas_paciente ON consultas(id_paciente);
CREATE INDEX idx_consultas_usuario ON consultas(id_usuario);
CREATE INDEX idx_consultas_fecha ON consultas(fecha);
CREATE INDEX idx_turnos_paciente ON turnos(id_paciente);
CREATE INDEX idx_turnos_usuario ON turnos(id_usuario);
CREATE INDEX idx_turnos_dia ON turnos(dia);
CREATE INDEX idx_turnos_situacion ON turnos(situacion);

-- Crear trigger para actualizar fecha_modificacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_consultas_fecha_modificacion
    BEFORE UPDATE ON consultas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER trigger_turnos_fecha_modificacion
    BEFORE UPDATE ON turnos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Mostrar mensaje de confirmación
SELECT 'Base de datos creada exitosamente' AS mensaje;