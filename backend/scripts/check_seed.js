// * Script: check_seed.js
// * Propósito: Verificar que exista el usuario de pruebas 'doctor@clinica.com' con contraseña 'password123'.
// * Si no existe, lo crea. Si la contraseña no coincide, la actualiza.
const bcrypt = require('bcrypt');
// Reutilizamos la conexión centralizada que maneja .env y SSL
const pool = require('../db/connection');

(async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado a DB. Verificando usuario de prueba...');

    const { rows } = await client.query(
      'SELECT id_usuario, email, nombre_completo, password_hash FROM usuarios WHERE email=$1 AND activo=true',
      ['doctor@clinica.com']
    );

    if (rows.length === 0) {
      console.log('Usuario de prueba no existe. Creándolo...');
      const passwordHash = await bcrypt.hash('password123', 10);
      const insert = await client.query(
        'INSERT INTO usuarios (email, nombre_completo, password_hash, rol, activo) VALUES ($1, $2, $3, $4, true) RETURNING id_usuario',
        ['doctor@clinica.com', 'Dr. Juan Pérez', passwordHash, 'doctor']
      );
      console.log('Usuario creado con id:', insert.rows[0].id_usuario);
    } else {
      const user = rows[0];
      const ok = await bcrypt.compare('password123', user.password_hash || '');
      if (ok) {
        console.log('El hash coincide. Credenciales de prueba válidas.');
      } else {
        console.log('El hash NO coincide. Actualizando contraseña del usuario de prueba...');
        const newHash = await bcrypt.hash('password123', 10);
        await client.query('UPDATE usuarios SET password_hash=$1 WHERE id_usuario=$2', [newHash, user.id_usuario]);
        console.log('Contraseña actualizada correctamente.');
      }
    }

    client.release();
  } catch (err) {
    console.error('Error verificando/ajustando usuario:', err);
  } finally {
    try { await pool.end(); } catch {}
  }
})();
