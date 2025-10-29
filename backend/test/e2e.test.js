const request = require('supertest');
const app = require('../server');

// Utilidades
function hoyFecha() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function horaValida() {
  return '10:00:00';
}

describe('E2E - API principal', () => {
  const agent = request.agent(app);

  let idPaciente;
  let idConsulta;
  let idTurno;

  beforeAll(async () => {
    jest.setTimeout(30000);
    // Login con seed por defecto
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'doctor@clinica.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body && res.body.usuario).toBeDefined();
  });

  test('Crear paciente', async () => {
    const dni = String(Math.floor(10000000 + Math.random() * 89999999));
    const res = await agent
      .post('/api/pacientes')
      .send({
        nombre: 'Test',
        apellido: 'E2E',
        dni,
        fecha_nacimiento: '1990-01-01',
        sexo: 'otro',
        telefono: '123456',
        email: `e2e_${dni}@test.com`,
      });
    expect(res.status).toBe(201);
    expect(res.body.id_paciente).toBeDefined();
    idPaciente = res.body.id_paciente;
  });

  test('Listar pacientes', async () => {
    const res = await agent.get('/api/pacientes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Crear consulta', async () => {
    const res = await agent
      .post('/api/consultas')
      .send({
        id_paciente: idPaciente,
        fecha: hoyFecha(),
        motivo_consulta: 'Control E2E',
        informe_medico: 'Sin novedades',
      });
    expect(res.status).toBe(201);
    expect(res.body.id_consulta).toBeDefined();
    idConsulta = res.body.id_consulta;
  });

  test('Listar consultas por paciente incluye la creada', async () => {
    const res = await agent.get(`/api/consultas/paciente/${idPaciente}`);
    expect(res.status).toBe(200);
    const existe = res.body.some(c => c.id_consulta === idConsulta);
    expect(existe).toBe(true);
  });

  test('Actualizar consulta', async () => {
    const res = await agent
      .put(`/api/consultas/${idConsulta}`)
      .send({ motivo_consulta: 'Control E2E actualizado' });
    expect(res.status).toBe(200);
  });

  test('Crear turno', async () => {
    const res = await agent
      .post('/api/turnos')
      .send({
        id_paciente: idPaciente,
        dia: hoyFecha(),
        horario: horaValida(),
        cobertura: 'Particular',
        detalle: 'Turno E2E',
      });
    expect(res.status).toBe(201);
    expect(res.body.id_turno).toBeDefined();
    idTurno = res.body.id_turno;
  });

  test('Cambiar situación de turno', async () => {
    const res = await agent
      .put(`/api/turnos/${idTurno}/situacion`)
      .send({ situacion: 'en_espera', hora_llegada: '10:05:00' });
    expect(res.status).toBe(200);
  });

  test('Eliminar turno', async () => {
    const res = await agent.delete(`/api/turnos/${idTurno}`);
    expect(res.status).toBe(200);
  });

  test('Eliminar consulta', async () => {
    const res = await agent.delete(`/api/consultas/${idConsulta}`);
    expect(res.status).toBe(200);
  });

  test('Eliminar paciente', async () => {
    const res = await agent.delete(`/api/pacientes/${idPaciente}`);
    expect(res.status).toBe(200);
  });
});
