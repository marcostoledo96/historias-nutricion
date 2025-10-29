// ! Punto de entrada del backend Express
// ? Este archivo levanta el servidor, configura middlewares, sesiones, rutas y sirve el frontend
// TODO: Si agregas nuevas rutas, impórtalas y móntalas aquí
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { exec } = require('child_process');
// * Cargar variables de entorno desde .env (puerto, credenciales DB, secretos, etc.)
require('dotenv').config();

const app = express();
// * Puerto de escucha (por defecto 3000)
const PORT = process.env.PORT || 3000;

// Middlewares
// * CORS: permitir cookies/sesiones desde el frontend servido localmente
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// * Body parsers para JSON y formularios (x-www-form-urlencoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
// * Sesiones en memoria (cambiar a store persistente en producción)
app.use(session({
  secret: process.env.SESSION_SECRET || 'historias_clinicas_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true en producción con HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Servir archivos estáticos del frontend
// * Servir el frontend estático (HTML/CSS/JS) desde la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// * Importar y montar rutas de la API (MVC)
const authRoutes = require('./routes/auth');
const pacientesRoutes = require('./routes/pacientes');
const consultasRoutes = require('./routes/consultas');
const turnosRoutes = require('./routes/turnos');

// Usar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/turnos', turnosRoutes);

// * Ruta raíz: entrega Inicio (la página maneja redirecciones si falta sesión)
app.get('/', (req, res) => {
  // Servir la página de Inicio como raíz; si no está autenticado, la propia página redirige a index.html
  res.sendFile(path.join(__dirname, '../frontend/inicio.html'));
});

// Middleware de manejo de errores
// * Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo de rutas no encontradas
// * 404 para rutas desconocidas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar el servidor sólo fuera de entorno de test
// * Iniciar el servidor (evitado en tests)
if (process.env.NODE_ENV !== 'test') {
  const MAX_REINTENTOS = 5;

  const iniciar = (puerto, intentosRestantes) => {
    const server = app.listen(puerto, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${puerto}`);
      console.log(`📁 Sirviendo archivos estáticos desde: ${path.join(__dirname, '../frontend')}`);

      // Apertura automática del navegador (opcional)
      // ? AUTO_OPEN=1 abre el navegador automáticamente (útil en desarrollo)
      if (process.env.AUTO_OPEN === '1') {
        setTimeout(() => {
          const url = `http://localhost:${puerto}`;
          if (process.platform === 'win32') {
            exec(`start "" "${url}"`);
          } else if (process.platform === 'darwin') {
            exec(`open "${url}"`);
          } else {
            exec(`xdg-open "${url}"`);
          }
        }, 800);
      }
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && intentosRestantes > 0) {
        const siguiente = puerto + 1;
        console.warn(`⚠️  El puerto ${puerto} está en uso. Reintentando en el puerto ${siguiente}...`);
        iniciar(siguiente, intentosRestantes - 1);
      } else {
        console.error('❌ No se pudo iniciar el servidor:', err?.message || err);
        process.exit(1);
      }
    });
  };

  iniciar(Number(PORT), MAX_REINTENTOS);
}

module.exports = app;