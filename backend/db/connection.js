// ! Conexión a PostgreSQL
// ? Este módulo expone un Pool (pg) configurado a partir de .env o DATABASE_URL
const { Pool } = require('pg');
const dns = require('dns');

const { buildDatabaseConfig } = require('./config');

// * Preferir IPv4 primero (mitiga ENOTFOUND/ETIMEDOUT en ciertos proveedores)
try {
  dns.setDefaultResultOrder && dns.setDefaultResultOrder('ipv4first');
} catch {}

const { poolConfig, safeConfig } = buildDatabaseConfig();

// * Crear Pool de conexiones
const pool = new Pool(poolConfig);

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
      console.error('❌ Error conectando a PostgreSQL:', err.message, '\nDetalles:', safeConfig);
      if (err.code === 'ENOTFOUND') {
        console.error(
          'ℹ️  Sugerencias: verifica que el hostname sea correcto (sin espacios extra) y que tu conexión a Internet o DNS pueda resolverlo.',
          `En Windows puedes probar con "Resolve-DnsName ${safeConfig.host}" y en macOS/Linux con "nslookup" o "dig".\n` +
            'Si usas Supabase, copia la cadena desde Project settings → Database → Connection string (formato db.<ref>.supabase.co).'
        );
      }
    } catch (_) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
    }
  });

module.exports = pool;
