// ! Rutas: Autenticación y perfil de usuario
// ? Maneja login/logout, verificación de sesión, registro (admin) y perfil
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { logging, validarCamposRequeridos, verificarAuth, verificarAdmin } = require('../middlewares/auth');

// * Logging básico para todas las rutas de este router
router.use(logging);

// * POST /api/auth/login
//   Body requerido: { email, password }
router.post('/login', 
  validarCamposRequeridos(['email', 'password']),
  authController.login
);

// * POST /api/auth/logout
router.post('/logout', authController.logout);

// * GET /api/auth/verificar
router.get('/verificar', authController.verificarSesion);

// * POST /api/auth/registro (solo admin)
//   Body requerido: { email, nombre_completo, password }
router.post('/registro', 
  verificarAuth,
  verificarAdmin,
  validarCamposRequeridos(['email', 'nombre_completo', 'password']),
  authController.registro
);

// * Recuperación de contraseña (flujo demo sin correo real)
router.post('/recuperar', authController.solicitarRecuperacion);
router.post('/restablecer', authController.restablecerConCodigo);

// * Perfil del usuario autenticado
router.get('/perfil', verificarAuth, authController.obtenerPerfil);
router.put('/perfil', verificarAuth, authController.actualizarPerfil);
router.put('/password', verificarAuth, authController.cambiarPassword);

module.exports = router;