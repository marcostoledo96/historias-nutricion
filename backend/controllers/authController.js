const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

// ! Controlador: Autenticación / Perfil
// ? Maneja login/logout, registro (admin), verificación y perfil + recuperación demo
// Almacenamiento en memoria de códigos de recuperación (solo demo; no persistente)
const codigosRecuperacion = new Map(); // email -> { codigo, expira }

const authController = {
  // POST /api/auth/login
  // * Iniciar sesión: valida credenciales, crea sesión y soporta "Recordarme"
  login: async (req, res) => {
    try {
  const { email, password, remember } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      // Buscar usuario por email
      const usuario = await Usuario.buscarPorEmail(email);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar contraseña
      const passwordValido = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Crear sesión
      req.session.usuarioId = usuario.id_usuario;
      req.session.usuario = {
        id: usuario.id_usuario,
        email: usuario.email,
        nombre: usuario.nombre_completo,
        rol: usuario.rol
      };

      // Si el usuario eligió "mantener sesión iniciada", extender duración de cookie (30 días)
      if (remember) {
        const dias30 = 30 * 24 * 60 * 60 * 1000;
        req.session.cookie.maxAge = dias30;
      } else {
        // Cookie de sesión (hasta cerrar navegador)
        req.session.cookie.expires = false;
      }

      res.json({
        mensaje: 'Login exitoso',
        usuario: {
          id: usuario.id_usuario,
          email: usuario.email,
          nombre: usuario.nombre_completo,
          rol: usuario.rol
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/logout
  // * Cerrar sesión: destruye la sesión y borra cookie
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.clearCookie('connect.sid');
      res.json({ mensaje: 'Sesión cerrada exitosamente' });
    });
  },

  // GET /api/auth/verificar
  // * Verificar sesión: devuelve autenticado=true/false y datos mínimos
  verificarSesion: (req, res) => {
    if (req.session.usuario) {
      res.json({ 
        autenticado: true, 
        usuario: req.session.usuario 
      });
    } else {
      res.json({ autenticado: false });
    }
  },

  // POST /api/auth/registro (solo para admins)
  // * Registro (solo admin): crea un usuario con hash de contraseña
  registro: async (req, res) => {
    try {
      const { email, nombre_completo, password, rol } = req.body;

      if (!email || !nombre_completo || !password) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
      }

      // Verificar si el usuario ya existe
      const usuarioExistente = await Usuario.buscarPorEmail(email);
      if (usuarioExistente) {
        return res.status(409).json({ error: 'El usuario ya existe' });
      }

      // Hash de la contraseña
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Crear usuario
      const nuevoUsuario = await Usuario.crear(email, nombre_completo, passwordHash, rol);

      res.status(201).json({
        mensaje: 'Usuario creado exitosamente',
        usuario: {
          id: nuevoUsuario.id_usuario,
          email: nuevoUsuario.email,
          nombre: nuevoUsuario.nombre_completo,
          rol: nuevoUsuario.rol
        }
      });

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

// Solicitar recuperación: genera un código de 6 dígitos y lo "envía" (log)
authController.solicitarRecuperacion = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = Date.now() + 15 * 60 * 1000; // 15 minutos
    codigosRecuperacion.set(email, { codigo, expira });
    console.log(`[RECUPERAR] Código para ${email}: ${codigo} (válido 15m)`);
    res.json({ mensaje: 'Código enviado' });
  } catch (e) {
    console.error('Error solicitarRecuperacion:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Restablecer contraseña con código
authController.restablecerConCodigo = async (req, res) => {
  try {
    const { email, codigo, password } = req.body;
    if (!email || !codigo || !password) return res.status(400).json({ error: 'Campos requeridos' });
    const registro = codigosRecuperacion.get(email);
    if (!registro) return res.status(400).json({ error: 'Solicita un código primero' });
    if (Date.now() > registro.expira) return res.status(400).json({ error: 'Código vencido' });
    if (registro.codigo !== String(codigo)) return res.status(400).json({ error: 'Código inválido' });

    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    // Actualizar password
    const pool = require('../db/connection');
    await pool.query('UPDATE usuarios SET password_hash=$1 WHERE id_usuario=$2', [passwordHash, usuario.id_usuario]);
    codigosRecuperacion.delete(email);
    res.json({ mensaje: 'Contraseña restablecida' });
  } catch (e) {
    console.error('Error restablecerConCodigo:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = authController;
// Nuevos endpoints de perfil
authController.obtenerPerfil = async (req, res) => {
  try {
    const id = req.session.usuario?.id;
    if (!id) return res.status(401).json({ error: 'No autenticado' });
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.buscarPorId(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: usuario.id_usuario, email: usuario.email, nombre: usuario.nombre_completo, rol: usuario.rol });
  } catch (e) {
    console.error('Error obtenerPerfil:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

authController.actualizarPerfil = async (req, res) => {
  try {
    const id = req.session.usuario?.id;
    if (!id) return res.status(401).json({ error: 'No autenticado' });
    const { email, nombre } = req.body;
    const Usuario = require('../models/Usuario');
    if (email) {
      const existe = await Usuario.existeEmailParaOtro(email, id);
      if (existe) return res.status(409).json({ error: 'El email ya está en uso' });
    }
    const actualizado = await Usuario.actualizarPerfil(id, { email, nombreCompleto: nombre });
    if (!actualizado) return res.status(400).json({ error: 'Nada para actualizar' });
    // Actualizar sesión
    req.session.usuario.email = actualizado.email;
    req.session.usuario.nombre = actualizado.nombre_completo;
    res.json({ mensaje: 'Perfil actualizado', usuario: { id: actualizado.id_usuario, email: actualizado.email, nombre: actualizado.nombre_completo, rol: actualizado.rol } });
  } catch (e) {
    console.error('Error actualizarPerfil:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

authController.cambiarPassword = async (req, res) => {
  try {
    const id = req.session.usuario?.id;
    if (!id) return res.status(401).json({ error: 'No autenticado' });
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva) return res.status(400).json({ error: 'Campos requeridos' });
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.buscarConHashPorId(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await require('bcrypt').compare(password_actual, usuario.password_hash);
    if (!ok) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    const saltRounds = 10;
    const nuevoHash = await require('bcrypt').hash(password_nueva, saltRounds);
    await Usuario.actualizarPassword(id, nuevoHash);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (e) {
    console.error('Error cambiarPassword:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};