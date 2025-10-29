#!/usr/bin/env node
// * Script: create_admin.js
// * Propósito: Crear o promover (si existe) un usuario a rol 'admin' y establecer su contraseña.
// * Uso: node scripts/create_admin.js --email=email@dominio --password=Secreta123 [--nombre="Nombre Apellido"]
// ? Si el email ya existe, actualiza password, rol=admin y activo=true; opcionalmente actualiza nombre.

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/connection');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const { email, password, nombre } = parseArgs();
  if (!email || !password) {
    console.error('Uso: node scripts/create_admin.js --email=... --password=... [--nombre="..."]');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sel = await client.query('SELECT id_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE email=$1', [email]);
      if (sel.rowCount > 0) {
        // Actualizar existente: password, rol admin y activo=true, opcionalmente nombre
        const setNombre = nombre ? ', nombre_completo=$4' : '';
        const params = nombre ? [hash, 'admin', true, nombre, email] : [hash, 'admin', true, email];
        const sql = `UPDATE usuarios SET password_hash=$1, rol=$2, activo=$3${setNombre} WHERE email=$${nombre ? 5 : 4} RETURNING id_usuario, email, nombre_completo, rol`;
        const upd = await client.query(sql, params);
        await client.query('COMMIT');
        console.log('✅ Usuario actualizado a admin:', upd.rows[0]);
      } else {
        const nom = nombre || 'Administrador';
        const ins = await client.query(
          'INSERT INTO usuarios (email, nombre_completo, password_hash, rol, activo) VALUES ($1,$2,$3,$4,true) RETURNING id_usuario, email, nombre_completo, rol',
          [email, nom, hash, 'admin']
        );
        await client.query('COMMIT');
        console.log('✅ Usuario admin creado:', ins.rows[0]);
      }
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error creando/promoviendo admin:', err.message);
    process.exit(1);
  } finally {
    // Cerrar pool para que el proceso termine
    setTimeout(() => pool.end(), 200);
  }
}

main();
