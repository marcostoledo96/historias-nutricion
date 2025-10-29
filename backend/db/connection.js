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
        const host = safeConfig.host || '(no definido)';
        console.error(
          'ℹ️  Sugerencias: verifica que el hostname sea correcto (sin espacios extra) y que tu conexión a Internet o DNS pueda resolverlo.',
          `En Windows puedes probar con "Resolve-DnsName ${host}" y en macOS/Linux con "nslookup" o "dig".\n` +
            'Si usas Supabase, copia la cadena desde Project settings → Database → Connection string (formato db.<ref>.supabase.co).'
        );

        if (typeof host === 'string') {
          const visibleHost = JSON.stringify(host);
          const charCodes = Array.from(host, (ch, idx) => `${idx}:${ch.charCodeAt(0)}`).join(' ');
          console.error(`🔡 Host recibido (JSON.stringify): ${visibleHost}`);
          console.error(`🔡 Códigos de caracteres del hostname: ${charCodes || '(vacío)'}`);
        }

        if (typeof host === 'string' && host.includes('.supabase.co')) {
          const supabaseMatch = host.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i);
          if (supabaseMatch) {
            console.error(
              `🔍 Host Supabase detectado con project ref "${supabaseMatch[1]}". Comprueba que coincida exactamente con el Project ref que muestra la consola de Supabase (Settings → General).`
            );
          } else {
            console.error(
              '🔍 El hostname parece de Supabase pero no respeta el patrón db.<project-ref>.supabase.co; revisa que no falten ni sobren letras.'
            );
          }
        }
      }
    } catch (_) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
    }
  });

module.exports = pool;
