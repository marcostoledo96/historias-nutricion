// * Modelo: Consulta
// * Gestiona consultas médicas y sus relaciones con pacientes.
// * Muchas lecturas incluyen JOIN con pacientes para mostrar datos básicos.
// ! La validación de permisos/negocio se maneja en controladores.
const pool = require('../db/connection');

class Consulta {
  // * obtenerTodas()
  // > Lista todas las consultas (de pacientes activos), ordenadas por fecha/hora desc.
  static async obtenerTodas(idUsuario) {
    try {
      const result = await pool.query(
        `SELECT c.*, p.nombre, p.apellido, p.dni 
         FROM consultas c
         JOIN pacientes p ON c.id_paciente = p.id_paciente
         WHERE p.activo = true AND c.id_usuario = $1 AND p.id_usuario = $1
         ORDER BY c.fecha DESC, c.hora DESC`,
        [idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorId(id)
  // > Devuelve una consulta enriquecida con datos del paciente (si está activo), o undefined.
  static async buscarPorId(id, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT c.*, p.nombre, p.apellido, p.dni, p.cobertura, p.plan, p.numero_afiliado
         FROM consultas c
         JOIN pacientes p ON c.id_paciente = p.id_paciente
         WHERE c.id_consulta = $1 AND p.activo = true AND c.id_usuario = $2 AND p.id_usuario = $2`,
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * obtenerPorPaciente(idPaciente)
  // > Lista consultas de un paciente (sin chequear estado activo del paciente aquí).
  static async obtenerPorPaciente(idPaciente, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT * FROM consultas 
         WHERE id_paciente = $1 AND id_usuario = $2
         ORDER BY fecha DESC, hora DESC`,
        [idPaciente, idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * crear(datosConsulta)
  // ? Requiere: id_paciente. fecha/hora son opcionales; se normalizan a ahora si faltan.
  // > Retorna { id_consulta }.
  static async crear(datosConsulta, idUsuario) {
    try {
      const {
        id_paciente, fecha, hora, motivo_consulta, informe_medico,
        diagnostico, tratamiento, estudios, archivo_adjunto
      } = datosConsulta;
      // Normalizar fecha y hora a formatos aceptados por Postgres (DATE y TIME)
      const ahora = new Date();
      const fechaVal = fecha || ahora.toISOString().slice(0, 10); // YYYY-MM-DD
      const horaVal = hora || ahora.toTimeString().slice(0, 8); // HH:MM:SS

      const result = await pool.query(
        `INSERT INTO consultas (
          id_usuario, id_paciente, fecha, hora, motivo_consulta, informe_medico,
          diagnostico, tratamiento, estudios, archivo_adjunto
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id_consulta`,
        [
          idUsuario,
          id_paciente, fechaVal, horaVal,
          motivo_consulta, informe_medico, diagnostico, tratamiento, estudios, archivo_adjunto
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * actualizar(id, datosConsulta)
  // > Actualiza campos médicos (no toca fecha/hora originales, salvo fecha_modificacion).
  static async actualizar(id, datosConsulta, idUsuario) {
    try {
      const {
        motivo_consulta, informe_medico, diagnostico, tratamiento, estudios, archivo_adjunto
      } = datosConsulta;

      const result = await pool.query(
        `UPDATE consultas SET 
         motivo_consulta = $1, informe_medico = $2, diagnostico = $3,
         tratamiento = $4, estudios = $5, archivo_adjunto = $6,
         fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_consulta = $7 AND id_usuario = $8
         RETURNING *`,
        [motivo_consulta, informe_medico, diagnostico, tratamiento, estudios, archivo_adjunto, id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * eliminar(id)
  // ! Delete físico (no soft-delete). Retorna { id_consulta } o undefined.
  static async eliminar(id, idUsuario) {
    try {
      const result = await pool.query(
        'DELETE FROM consultas WHERE id_consulta = $1 AND id_usuario = $2 RETURNING id_consulta',
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorFecha(fecha)
  // ? fecha: string YYYY-MM-DD
  // > Devuelve consultas del día con datos básicos del paciente.
  static async buscarPorFecha(fecha, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT c.*, p.nombre, p.apellido, p.dni
         FROM consultas c
         JOIN pacientes p ON c.id_paciente = p.id_paciente
         WHERE c.fecha = $1 AND p.activo = true AND c.id_usuario = $2 AND p.id_usuario = $2
         ORDER BY c.hora`,
        [fecha, idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Consulta;