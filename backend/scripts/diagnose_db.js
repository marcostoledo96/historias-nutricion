#!/usr/bin/env node

// Herramienta para depurar errores de conexión a PostgreSQL (especialmente ENOTFOUND)
const dns = require('dns').promises;
const tls = require('tls');
const { once } = require('events');

const { buildDatabaseConfig } = require('../db/config');

(async () => {
  const { poolConfig, safeConfig, hasConnectionString, rawDatabaseUrl } = buildDatabaseConfig();
  const hostForLookup = poolConfig.host || safeConfig.host;
  const portForLookup = poolConfig.port || safeConfig.port || 5432;
  const databaseName = safeConfig.database || poolConfig.database || '(no definido)';
  const sslEnabled = Boolean(safeConfig.ssl);

  console.log('🔎 Diagnóstico de conexión PostgreSQL');
  console.log('────────────────────────────────────');
  if (hasConnectionString) {
    console.log('• Origen: DATABASE_URL');
    console.log(`• Cadena: ${rawDatabaseUrl}`);
  } else {
    console.log('• Origen: variables por campo (DB_HOST, DB_USER, etc.)');
  }
  console.log(`• Host: ${hostForLookup ?? '(no definido)'}`);
  console.log(`• Puerto: ${portForLookup}`);
  console.log(`• Base de datos: ${databaseName}`);
  console.log(`• SSL requerido: ${sslEnabled ? 'sí' : 'no'}`);
  console.log('');

  if (!hostForLookup) {
    console.error('❌ No se pudo determinar el hostname objetivo a partir de las variables de entorno.');
    console.error('   → Revisa que DATABASE_URL tenga el formato correcto (postgresql://usuario:pass@host:puerto/db).');
    process.exitCode = 1;
    return;
  }

  try {
    const lookup = await dns.lookup(hostForLookup, { all: true });
    console.log('✅ Resolución DNS OK:', lookup.map((entry) => `${entry.address} (${entry.family})`).join(', '));
  } catch (err) {
    console.error('❌ Error al resolver DNS:', err.message);
    console.error('   → Verifica que el hostname sea correcto y que no tenga espacios ocultos.');
    console.error('   → Si usas Supabase, copia la URL nuevamente desde Project settings → Database → Connection string.');
    process.exitCode = 1;
    return;
  }

  if (!sslEnabled) {
    console.warn('⚠️  SSL desactivado; se omitirá la prueba TLS. Asegúrate de que tu proveedor permita conexiones sin SSL.');
    return;
  }

  const socket = tls.connect({
    host: hostForLookup,
    port: portForLookup,
    servername: hostForLookup,
    rejectUnauthorized: false,
  });
  socket.setTimeout(5000);

  try {
    await Promise.race([
      once(socket, 'secureConnect'),
      once(socket, 'timeout').then(() => {
        throw new Error('timeout');
      }),
      once(socket, 'error').then(([err]) => {
        throw err;
      }),
    ]);
    console.log('✅ El puerto responde y acepta conexiones TLS.');
  } catch (err) {
    console.error('❌ El puerto no pudo establecer una sesión TLS:', err.message);
    console.error('   → Comprueba firewalls/redes y que el servicio esté arriba.');
    process.exitCode = 1;
  } finally {
    socket.destroy();
  }
})();
