// ! Rutas: Pacientes
// ? CRUD de pacientes y búsquedas
const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientesController');
const { verificarAuth, verificarDoctor, logging, validarCamposRequeridos } = require('../middlewares/auth');

// * Middlewares por defecto: logging, sesión, rol doctor
router.use(logging);
router.use(verificarAuth);
router.use(verificarDoctor);

// * GET /api/pacientes
//   Query opcional: q=texto (nombre, apellido o DNI)
router.get('/', pacientesController.obtenerPacientes);

// * GET /api/pacientes/:id
router.get('/:id', pacientesController.obtenerPacientePorId);

// * GET /api/pacientes/buscar/:dni
router.get('/buscar/:dni', pacientesController.buscarPorDni);

// * POST /api/pacientes
//   Body requerido: { nombre, apellido, ...opcionales }
router.post('/', 
  validarCamposRequeridos(['nombre', 'apellido']),
  pacientesController.crearPaciente
);

// * POST /api/pacientes/minimo
//   Crea registro mínimo: { nombre, apellido }
router.post('/minimo', 
  validarCamposRequeridos(['nombre', 'apellido']),
  pacientesController.crearPacienteMinimo
);

// * PUT /api/pacientes/:id
router.put('/:id', 
  validarCamposRequeridos(['nombre', 'apellido']),
  pacientesController.actualizarPaciente
);

// * DELETE /api/pacientes/:id (soft delete)
router.delete('/:id', pacientesController.eliminarPaciente);

module.exports = router;