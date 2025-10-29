// * Script: create_user.js
// * Crea un usuario (doctor/admin) con email, nombre y contraseña.
// * Uso:
// *   node scripts/create_user.js --email=doctor2@clinica.com --password=Secreta123 --nombre="Dr. Segundo" --rol=doctor
// * Si el usuario existe:
// *   - Si se pasa --password, actualiza la contraseña.
// *   - Actualiza nombre y rol si se proveen.

const bcrypt = require('bcrypt');
const pool = require('../db/connection');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv);
  const email = args.email;
  const password = args.password;
  const nombre = args.nombre || args["nombre_completo"];
  const rol = args.rol || 'doctor';

  if (!email) {
    console.error('Falta --email=');
    process.exit(1);
  }

  try {
    const client = await pool.connect();

    const { rows } = await client.query('SELECT * FROM usuarios WHERE email=$1', [email]);

    if (rows.length === 0) {
      if (!password || !nombre) {
        console.error('Para crear un usuario nuevo se requieren --password= y --nombre=');
        process.exit(1);
      }
      const hash = await bcrypt.hash(password, 10);
      const ins = await client.query(
        'INSERT INTO usuarios (email, nombre_completo, password_hash, rol, activo) VALUES ($1, $2, $3, $4, true) RETURNING id_usuario, email, nombre_completo, rol',
        [email, nombre, hash, rol]
      );
      console.log('✅ Usuario creado:', ins.rows[0]);
    } else {
      const user = rows[0];
      let changed = false;
      if (nombre && nombre !== user.nombre_completo) {
        await client.query('UPDATE usuarios SET nombre_completo=$1 WHERE id_usuario=$2', [nombre, user.id_usuario]);
        changed = true;
      }
      if (rol && rol !== user.rol) {
        await client.query('UPDATE usuarios SET rol=$1 WHERE id_usuario=$2', [rol, user.id_usuario]);
        changed = true;
      }
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await client.query('UPDATE usuarios SET password_hash=$1 WHERE id_usuario=$2', [hash, user.id_usuario]);
        changed = true;
      }
      console.log(changed ? '✅ Usuario actualizado' : 'ℹ️  Usuario ya existía, sin cambios');
    }

    client.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch {}
  }
})();
