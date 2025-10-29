-- Scripts de datos de prueba para Sistema de Historias Clínicas
-- Ejecutar después de scripts.sql

-- Insertar usuario doctor de prueba
INSERT INTO usuarios (email, nombre_completo, password_hash, rol) VALUES 
('doctor@clinica.com', 'Dr. Juan Pérez', '$2b$10$..gWSkDIP5CTGqNPhV.fzutWY15bHy.ridVUnyyZQ2RNDydjOBCfC', 'doctor'),
('admin@clinica.com', 'Administrador Sistema', '$2b$10$..gWSkDIP5CTGqNPhV.fzutWY15bHy.ridVUnyyZQ2RNDydjOBCfC', 'admin');
-- Contraseña: "password123" (cambiar en producción)

-- Insertar pacientes de prueba (asignados al doctor por defecto)
INSERT INTO pacientes (id_usuario, nombre, apellido, dni, fecha_nacimiento, sexo, telefono, email, cobertura, plan, numero_afiliado, localidad, direccion, ocupacion) VALUES 
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'María', 'González', '12345678', '1985-03-15', 'femenino', '1123456789', 'maria.gonzalez@email.com', 'OSDE', 'Plan 310', '123456789', 'Buenos Aires', 'Av. Corrientes 1234', 'Contadora'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Carlos', 'Rodríguez', '23456789', '1978-07-22', 'masculino', '1134567890', 'carlos.rodriguez@email.com', 'Swiss Medical', 'SMG02', '234567890', 'La Plata', 'Calle 50 N° 567', 'Ingeniero'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Ana', 'Martínez', '34567890', '1992-11-08', 'femenino', '1145678901', 'ana.martinez@email.com', 'Galeno', 'Plan Azul', '345678901', 'Quilmes', 'Rivadavia 890', 'Profesora'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Roberto', 'López', '45678901', '1965-05-30', 'masculino', '1156789012', 'roberto.lopez@email.com', 'IOMA', 'Plan Básico', '456789012', 'Avellaneda', 'Belgrano 234', 'Jubilado'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Laura', 'Fernández', '56789012', '1988-12-14', 'femenino', '1167890123', 'laura.fernandez@email.com', 'Medicus', 'Plan Familia', '567890123', 'San Isidro', 'Libertador 1456', 'Abogada'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Diego', 'Silva', '67890123', '1980-09-03', 'masculino', '1178901234', 'diego.silva@email.com', 'Omint', 'Plan Premium', '678901234', 'Vicente López', 'Maipú 789', 'Médico'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Patricia', 'Castro', '78901234', '1975-02-28', 'femenino', '1189012345', 'patricia.castro@email.com', 'OSECAC', 'Plan Superior', '789012345', 'Morón', 'San Martín 345', 'Enfermera'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Marcos', 'Herrera', '89012345', '1983-06-17', 'masculino', '1190123456', 'marcos.herrera@email.com', 'Accord Salud', 'Plan Joven', '890123456', 'Tigre', 'Lavalle 567', 'Programador'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Claudia', 'Morales', '90123456', '1990-10-25', 'femenino', '1101234567', 'claudia.morales@email.com', 'Federada Salud', 'Plan Básico', '901234567', 'Lomas de Zamora', 'Hipólito Yrigoyen 123', 'Diseñadora'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 'Sebastián', 'Vega', '01234567', '1987-04-12', 'masculino', '1112345678', 'sebastian.vega@email.com', 'OSDE', 'Plan 450', '012345678', 'Banfield', 'Cochabamba 789', 'Comerciante');

-- Insertar consultas de prueba (asignadas al doctor)
INSERT INTO consultas (id_usuario, id_paciente, fecha, motivo_consulta, informe_medico, diagnostico, tratamiento) VALUES 
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 1, '2024-10-15', 'Control de rutina', 'Paciente en buen estado general. Signos vitales normales.', 'Examen clínico normal', 'Continuar con controles anuales'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 1, '2024-09-20', 'Dolor de cabeza frecuente', 'Cefaleas tensionales. No signos neurológicos.', 'Cefalea tensional', 'Ibuprofeno 400mg cada 8hs por 5 días'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 2, '2024-10-14', 'Dolor en el pecho', 'ECG normal. Dolor relacionado con estrés laboral.', 'Dolor torácico no cardíaco', 'Relajación y control del estrés'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 3, '2024-10-13', 'Control embarazo', 'Embarazo de 20 semanas. Ecografía normal.', 'Embarazo normal', 'Ácido fólico y controles mensuales'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 4, '2024-10-12', 'Hipertensión arterial', 'TA 150/95. Paciente hipertenso conocido.', 'Hipertensión arterial esencial', 'Enalapril 10mg/día'),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 5, '2024-10-11', 'Dolor lumbar', 'Contractura muscular lumbar. Movilidad limitada.', 'Lumbalgia mecánica', 'Diclofenac gel y fisioterapia');

-- Insertar turnos de prueba (asignados al doctor)
INSERT INTO turnos (id_usuario, id_paciente, id_consulta, dia, horario, cobertura, situacion, primera_vez) VALUES 
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 1, 1, '2024-10-15', '09:00', 'OSDE', 'atendido', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 2, 3, '2024-10-14', '10:30', 'Swiss Medical', 'atendido', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 3, 4, '2024-10-13', '11:00', 'Galeno', 'atendido', true),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 4, 5, '2024-10-12', '14:00', 'IOMA', 'atendido', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 5, 6, '2024-10-11', '15:30', 'Medicus', 'atendido', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 6, NULL, '2024-10-18', '09:30', 'Omint', 'programado', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 7, NULL, '2024-10-18', '10:00', 'OSECAC', 'programado', true),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 8, NULL, '2024-10-18', '11:30', 'Accord Salud', 'en_espera', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 9, NULL, '2024-10-18', '14:30', 'Federada Salud', 'programado', false),
((SELECT id_usuario FROM usuarios WHERE email='doctor@clinica.com' LIMIT 1), 10, NULL, '2024-10-18', '16:00', 'OSDE', 'programado', true);

-- Mostrar estadísticas
SELECT 'Datos de prueba insertados exitosamente' AS mensaje;
SELECT COUNT(*) AS total_usuarios FROM usuarios;
SELECT COUNT(*) AS total_pacientes FROM pacientes;
SELECT COUNT(*) AS total_consultas FROM consultas;
SELECT COUNT(*) AS total_turnos FROM turnos;