// ! Rutas: Consultas
// ? Endpoints REST para listar, crear, actualizar y borrar consultas
const express = require('express');
const router = express.Router();
const consultasController = require('../controllers/consultasController');
const { verificarAuth, verificarDoctor, logging, validarCamposRequeridos } = require('../middlewares/auth');

// * Middlewares globales en este router
//   - logging: registra método y URL
//   - verificarAuth: exige sesión iniciada
//   - verificarDoctor: exige rol adecuado
router.use(logging);
router.use(verificarAuth);
router.use(verificarDoctor);

// * GET /api/consultas
//   Devuelve todas las consultas (el filtrado por fecha/paciente se expone en rutas separadas)
router.get('/', consultasController.obtenerConsultas);

// * GET /api/consultas/:id
//   Path params: id (number)
router.get('/:id', consultasController.obtenerConsultaPorId);

// * GET /api/consultas/paciente/:id_paciente
//   Path params: id_paciente (number)
router.get('/paciente/:id_paciente', consultasController.obtenerConsultasPorPaciente);

// * GET /api/consultas/fecha/:fecha
//   Path params: fecha (YYYY-MM-DD)
router.get('/fecha/:fecha', consultasController.obtenerConsultasPorFecha);

// * POST /api/consultas
//   Body JSON requerido: { id_paciente, motivo_consulta, ...opcionales }
router.post('/', 
  validarCamposRequeridos(['id_paciente', 'motivo_consulta']),
  consultasController.crearConsulta
);

// * PUT /api/consultas/:id
//   Body JSON requerido: { motivo_consulta, ...opcionales }
router.put('/:id', 
  validarCamposRequeridos(['motivo_consulta']),
  consultasController.actualizarConsulta
);

// * DELETE /api/consultas/:id
router.delete('/:id', consultasController.eliminarConsulta);

module.exports = router;