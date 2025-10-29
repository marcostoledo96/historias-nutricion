// * Script: migrate.js
// * Propósito: Crear/actualizar el esquema y sembrar datos de prueba ejecutando scripts.sql y seeds.sql.
// * Uso: node migrate.js
// ? Requiere variables de entorno para la conexión (DATABASE_URL o equivalentes) y archivos en database/.
const fs = require('fs');
const path = require('path');
// Reutilizar la conexión centralizada que ya gestiona .env y SSL
const pool = require('./db/connection');

async function ejecutarMigraciones() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    // La conexión ya fue probada en db/connection.js
    console.log('✅ Conexión inicializada!');

    // Leer y ejecutar scripts.sql
    console.log('📝 Ejecutando scripts de creación de tablas...');
    const scriptSQL = fs.readFileSync(path.join(__dirname, '../database/scripts.sql'), 'utf8');
    await pool.query(scriptSQL);
    console.log('✅ Tablas creadas exitosamente!');

    // Leer y ejecutar seeds.sql
    console.log('🌱 Insertando datos de prueba...');
    const seedsSQL = fs.readFileSync(path.join(__dirname, '../database/seeds.sql'), 'utf8');
    await pool.query(seedsSQL);
    console.log('✅ Datos de prueba insertados exitosamente!');

    console.log('🎉 ¡Base de datos configurada completamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detalles:', error);
  } finally {
    try { await pool.end(); } catch {}
    process.exit();
  }
}

ejecutarMigraciones();