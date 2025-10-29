// Middleware para verificar autenticación
const verificarAuth = (req, res, next) => {
  if (req.session && req.session.usuario) {
    return next();
  } else {
    return res.status(401).json({ error: 'No autenticado. Debes iniciar sesión.' });
  }
};

// Middleware para verificar rol de admin
const verificarAdmin = (req, res, next) => {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
    return next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
};

// Middleware para verificar que sea doctor o admin
const verificarDoctor = (req, res, next) => {
  if (req.session && req.session.usuario && 
      (req.session.usuario.rol === 'doctor' || req.session.usuario.rol === 'admin')) {
    return next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos médicos.' });
  }
};

// Middleware de logging
const logging = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const usuario = req.session?.usuario?.email || 'anónimo';
  console.log(`[${timestamp}] ${req.method} ${req.url} - Usuario: ${usuario}`);
  next();
};

// Middleware de validación de campos requeridos
const validarCamposRequeridos = (camposRequeridos) => {
  return (req, res, next) => {
    const camposFaltantes = [];
    
    for (const campo of camposRequeridos) {
      if (!req.body[campo] || req.body[campo].toString().trim() === '') {
        camposFaltantes.push(campo);
      }
    }
    
    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  verificarAuth,
  verificarAdmin,
  verificarDoctor,
  logging,
  validarCamposRequeridos
};