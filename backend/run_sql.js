// * Script: run_sql.js
// * Propósito: Ejecutar un archivo .sql arbitrario contra la DB (útil para hotfixes o tareas manuales).
// * Uso: node run_sql.js <ruta_al_sql>
// ? Soporta rutas relativas a backend/ y absolutas. Requiere variables de entorno de conexión.
const fs = require('fs');
const path = require('path');
// Reutiliza la conexión centralizada (carga .env y maneja SSL)
const pool = require('./db/connection');

(async () => {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Uso: node run_sql.js <ruta_al_sql>');
    process.exit(1);
  }
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(__dirname, fileArg);
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`▶ Ejecutando SQL desde: ${filePath}`);
    await pool.query(sql);
    console.log('✅ SQL ejecutado correctamente');
  } catch (err) {
    console.error('❌ Error ejecutando SQL:', err.message);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch {}
  }
})();
