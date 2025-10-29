const request = require('supertest');
const app = require('../server');

/**
 * Pruebas de aislamiento multi-tenant por id_usuario
 * Flujo:
 * 1) Login como admin y crear un usuario doctor2
 * 2) Login como doctor@clinica.com y crear un paciente A
 * 3) Login como doctor2 y verificar que NO ve paciente A; crear paciente B
 * 4) Volver a doctor@clinica.com y verificar que NO ve paciente B
 */

describe('Multi-tenant - Aislamiento por usuario', () => {
  const admin = request.agent(app);
  const doctor1 = request.agent(app);
  const doctor2 = request.agent(app);

  let doctor2Creds = {
    email: `doctor2_${Date.now()}@clinica.com`,
    nombre: 'Dr. Segundo',
    password: 'Segura1234'
  };

  let pacienteAId; // creado por doctor1
  let pacienteBId; // creado por doctor2

  beforeAll(async () => {
    jest.setTimeout(40000);
    // Login admin
    let r = await admin.post('/api/auth/login').send({ email: 'admin@clinica.com', password: 'password123' });
    expect(r.status).toBe(200);
    // Crear doctor2
    r = await admin
      .post('/api/auth/registro')
      .send({ email: doctor2Creds.email, nombre_completo: doctor2Creds.nombre, password: doctor2Creds.password, rol: 'doctor' });
    expect([200,201,409]).toContain(r.status); // si ya existía, 409

    // Login doctor1
    r = await doctor1.post('/api/auth/login').send({ email: 'doctor@clinica.com', password: 'password123' });
    expect(r.status).toBe(200);

    // Login doctor2
    r = await doctor2.post('/api/auth/login').send({ email: doctor2Creds.email, password: doctor2Creds.password });
    expect(r.status).toBe(200);
  });

  test('Doctor1 crea Paciente A y doctor2 no lo ve', async () => {
    // Crear paciente A con doctor1
    let res = await doctor1.post('/api/pacientes').send({ nombre: 'Paciente', apellido: 'A', dni: null });
    expect(res.status).toBe(201);
    pacienteAId = res.body.id_paciente;

    // Doctor2 lista pacientes y no debe ver pacienteAId
    res = await doctor2.get('/api/pacientes');
    expect(res.status).toBe(200);
    const existe = (res.body || []).some(p => p.id_paciente === pacienteAId);
    expect(existe).toBe(false);
  });

  test('Doctor2 crea Paciente B y doctor1 no lo ve', async () => {
    // Crear paciente B con doctor2
    let res = await doctor2.post('/api/pacientes').send({ nombre: 'Paciente', apellido: 'B', dni: null });
    expect(res.status).toBe(201);
    pacienteBId = res.body.id_paciente;

    // Doctor1 lista pacientes y no debe ver pacienteBId
    res = await doctor1.get('/api/pacientes');
    expect(res.status).toBe(200);
    const existe = (res.body || []).some(p => p.id_paciente === pacienteBId);
    expect(existe).toBe(false);
  });
});
