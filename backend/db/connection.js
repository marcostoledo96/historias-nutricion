// ! Conexión a PostgreSQL
// ? Este módulo expone un Pool (pg) configurado a partir de .env o DATABASE_URL
const { Pool } = require('pg');
const dns = require('dns');
const path = require('path');
// * Preferir IPv4 primero (mitiga ENOTFOUND/ETIMEDOUT en ciertos proveedores)
try { dns.setDefaultResultOrder && dns.setDefaultResultOrder('ipv4first'); } catch {}
// * Cargar .env desde backend explícitamente (evita depender del CWD)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// * Permitir configurar la conexión vía DATABASE_URL o por campos separados
const hasConnectionString = !!process.env.DATABASE_URL;

// * Parseo robusto de DATABASE_URL → objeto de config legible por pg
function parseDatabaseUrl(dbUrl) {
  try {
    const u = new URL(dbUrl);
    return {
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || ''),
      database: decodeURIComponent((u.pathname || '/postgres').slice(1)),
    };
  } catch (e) {
    console.warn('No se pudo parsear DATABASE_URL, usando connectionString directo. Motivo:', e.message);
    return { connectionString: dbUrl };
  }
}

// * Config base final según haya o no DATABASE_URL
const baseConfig = hasConnectionString
  ? parseDatabaseUrl(process.env.DATABASE_URL)
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'historias_clinicas',
      port: Number(process.env.DB_PORT || 5432),
    };

// * SSL robusto por defecto (entornos gestionados como Supabase/Heroku)
//   Se puede desactivar con NO_SSL=true o PGSSLMODE=disable; no-verify evita problemas con certificados
const sslMode = String(process.env.PGSSLMODE || '').toLowerCase();
const noSSL = String(process.env.NO_SSL || '').toLowerCase() === 'true' || sslMode === 'disable';
const noVerify = sslMode === 'no-verify' || sslMode === 'prefer';

const sslConfig = noSSL
  ? false
  : { require: true, rejectUnauthorized: !noVerify && false };

// * Crear Pool de conexiones
const pool = new Pool({
  ...baseConfig,
  ssl: sslConfig,
  // Opciones de resiliencia
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  idleTimeoutMillis: 30000, // cerrar conexiones ociosas tras 30s
  connectionTimeoutMillis: 10000, // timeout de conexión inicial
  max: Number(process.env.PGPOOL_MAX || 10),
});

// Evitar crash si una conexión ociosa emite 'error' (p.ej., reinicio del servidor o pooler)
pool.on('error', (err) => {
  console.error('⚠️  Error en cliente ocioso del pool de PostgreSQL:', err?.message || err);
});

// ? Probar la conexión al iniciar (log no bloqueante)
pool
  .connect()
  .then((client) => {
    console.log('✅ Conectado a PostgreSQL exitosamente');
    client.release();
  })
  .catch((err) => {
    try {
      const safe = {
        host: baseConfig.host,
        port: baseConfig.port,
        database: baseConfig.database,
        user: baseConfig.user ? baseConfig.user.replace(/.*/,'***') : undefined, // no exponer
        ssl: sslConfig ? { require: sslConfig.require, rejectUnauthorized: sslConfig.rejectUnauthorized } : false,
      };
      console.error('❌ Error conectando a PostgreSQL:', err.message, '\
\nDetalles:', safe);
    } catch (_) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
    }
  });

module.exports = pool;