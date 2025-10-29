// * Modelo: Usuario
// * Maneja autenticación, perfiles y administración de usuarios.
// * Las contraseñas se almacenan como `password_hash` (bcrypt) y nunca se exponen salvo donde explícitamente se busca con hash.
// ! Cualquier error de DB se propaga; los controladores deben capturarlo y traducirlo.
const pool = require('../db/connection');

class Usuario {
  // * buscarPorEmail(email)
  // ? email: string
  // > Devuelve el usuario activo (sin exponer hash) o undefined si no existe.
  static async buscarPorEmail(email) {
    try {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * crear(email, nombreCompleto, passwordHash, rol = 'doctor')
  // ? Inserta un usuario con rol por defecto 'doctor'.
  // ! `passwordHash` debe venir ya hasheado (bcrypt) por la capa de controlador/servicio.
  // > Retorna datos públicos: id_usuario, email, nombre_completo, rol.
  static async crear(email, nombreCompleto, passwordHash, rol = 'doctor') {
    try {
      const result = await pool.query(
        'INSERT INTO usuarios (email, nombre_completo, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id_usuario, email, nombre_completo, rol',
        [email, nombreCompleto, passwordHash, rol]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorId(id)
  // > Devuelve campos públicos del usuario activo o undefined.
  static async buscarPorId(id) {
    try {
      const result = await pool.query(
        'SELECT id_usuario, email, nombre_completo, rol, fecha_registro FROM usuarios WHERE id_usuario = $1 AND activo = true',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * obtenerTodos()
  // > Lista usuarios activos (sólo campos públicos) ordenados por nombre.
  static async obtenerTodos() {
    try {
      const result = await pool.query(
        'SELECT id_usuario, email, nombre_completo, rol, fecha_registro FROM usuarios WHERE activo = true ORDER BY nombre_completo'
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * existeEmailParaOtro(email, idUsuario)
  // > Verifica unicidad de email al editar perfil; true si existe en otro usuario activo.
  static async existeEmailParaOtro(email, idUsuario) {
    try {
      const result = await pool.query(
        'SELECT 1 FROM usuarios WHERE email = $1 AND id_usuario <> $2 AND activo = true LIMIT 1',
        [email, idUsuario]
      );
      return !!result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  // * actualizarPerfil(idUsuario, { email, nombreCompleto })
  // > Actualiza parcialmente email/nombre. Retorna datos públicos o null si no hay cambios.
  // ! No permite cambiar el rol ni el hash de contraseña aquí.
  static async actualizarPerfil(idUsuario, { email, nombreCompleto }) {
    try {
      const sets = [];
      const values = [];
      let idx = 1;
      if (email) {
        sets.push(`email = $${idx++}`);
        values.push(email);
      }
      if (nombreCompleto) {
        sets.push(`nombre_completo = $${idx++}`);
        values.push(nombreCompleto);
      }
      if (!sets.length) return null;
      values.push(idUsuario);
      const query = `UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = $${idx} RETURNING id_usuario, email, nombre_completo, rol`;
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * actualizarPassword(idUsuario, nuevoHash)
  // ! `nuevoHash` debe estar hasheado (bcrypt). No retorna datos del usuario.
  static async actualizarPassword(idUsuario, nuevoHash) {
    try {
      await pool.query('UPDATE usuarios SET password_hash=$1 WHERE id_usuario=$2', [nuevoHash, idUsuario]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // * buscarConHashPorId(id)
  // > Devuelve el usuario activo incluyendo `password_hash`. Útil para flujos de seguridad.
  // ! Manejar con cuidado; no exponer este objeto a clientes.
  static async buscarConHashPorId(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id_usuario = $1 AND activo = true',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Usuario;