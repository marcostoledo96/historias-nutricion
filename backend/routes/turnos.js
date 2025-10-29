// ! Rutas: Turnos
// ? Gestiona turnos por día/paciente y sus estados
const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnosController');
const { verificarAuth, verificarDoctor, logging, validarCamposRequeridos } = require('../middlewares/auth');

// * Middlewares globales: logging + auth + rol doctor
router.use(logging);
router.use(verificarAuth);
router.use(verificarDoctor);

// * GET /api/turnos
//   Listado general (ver también rutas específicas por día/paciente)
router.get('/', turnosController.obtenerTurnos);

// * GET /api/turnos/hoy
router.get('/hoy', turnosController.obtenerTurnosHoy);

// * GET /api/turnos/:id
router.get('/:id', turnosController.obtenerTurnoPorId);

// * GET /api/turnos/dia/:dia
//   Path param: dia (YYYY-MM-DD)
router.get('/dia/:dia', turnosController.obtenerTurnosPorDia);

// * GET /api/turnos/paciente/:id_paciente
router.get('/paciente/:id_paciente', turnosController.obtenerTurnosPorPaciente);

// * POST /api/turnos
//   Requeridos: { dia, horario }. Si no hay id_paciente, enviar paciente_nombre_tmp y paciente_apellido_tmp
router.post('/', 
  validarCamposRequeridos(['dia', 'horario']),
  turnosController.crearTurno
);

// * PUT /api/turnos/:id
router.put('/:id', 
  validarCamposRequeridos(['dia', 'horario']),
  turnosController.actualizarTurno
);

// * PUT /api/turnos/:id/situacion
router.put('/:id/situacion', 
  validarCamposRequeridos(['situacion']),
  turnosController.marcarSituacion
);

// * DELETE /api/turnos/:id
router.delete('/:id', turnosController.eliminarTurno);

module.exports = router;