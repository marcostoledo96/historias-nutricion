// * Modelo: Turno
// * Gestiona turnos (citas) y su relación con pacientes.
// * Permite turnos con o sin paciente registrado usando campos temporales paciente_*_tmp.
// ! Situación del turno: 'programado', 'en_sala', 'atendido', 'ausente', etc. Controlada por controlador.
const pool = require('../db/connection');

class Turno {
  // * obtenerTodos()
  // > Lista todos los turnos, mostrando nombre/apellido desde paciente o campos temporales.
  static async obtenerTodos(idUsuario) {
    try {
      const result = await pool.query(
        `SELECT t.*, 
                COALESCE(p.nombre, t.paciente_nombre_tmp) AS nombre,
                COALESCE(p.apellido, t.paciente_apellido_tmp) AS apellido,
                p.dni, p.telefono, p.cobertura AS cobertura_paciente
         FROM turnos t
         LEFT JOIN pacientes p ON t.id_paciente = p.id_paciente AND p.activo = true
         WHERE t.id_usuario = $1
         ORDER BY t.dia DESC, t.horario`,
        [idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorId(id)
  // > Devuelve un turno enriquecido. Si no hay paciente, usa *_tmp para nombre/apellido.
  static async buscarPorId(id, idUsuario) {
    try {
      const result = await pool.query(
  `SELECT t.*, 
    COALESCE(p.nombre, t.paciente_nombre_tmp) AS nombre,
    COALESCE(p.apellido, t.paciente_apellido_tmp) AS apellido,
    p.dni, p.telefono, p.cobertura AS cobertura_paciente, p.plan
         FROM turnos t
         LEFT JOIN pacientes p ON t.id_paciente = p.id_paciente AND p.activo = true
         WHERE t.id_turno = $1 AND t.id_usuario = $2`,
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * obtenerPorDia(dia)
  // ? dia: string YYYY-MM-DD
  // > Lista turnos del día indicado ordenados por horario.
  static async obtenerPorDia(dia, idUsuario) {
    try {
      const result = await pool.query(
  `SELECT t.*, 
    COALESCE(p.nombre, t.paciente_nombre_tmp) AS nombre,
    COALESCE(p.apellido, t.paciente_apellido_tmp) AS apellido,
    p.dni, p.telefono, p.cobertura AS cobertura_paciente
         FROM turnos t
         LEFT JOIN pacientes p ON t.id_paciente = p.id_paciente AND p.activo = true
         WHERE t.dia = $1 AND t.id_usuario = $2
         ORDER BY t.horario`,
        [dia, idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * obtenerPorPaciente(idPaciente)
  // > Lista turnos asociados a un paciente específico.
  static async obtenerPorPaciente(idPaciente, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT * FROM turnos 
         WHERE id_paciente = $1 AND id_usuario = $2
         ORDER BY dia DESC, horario`,
        [idPaciente, idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * crear(datosTurno)
  // ? Permite crear con id_paciente o con paciente_nombre_tmp/paciente_apellido_tmp.
  // ? Campos: id_paciente|null, dia (YYYY-MM-DD), horario (HH:MM), cobertura, situacion, detalle, primera_vez (bool), *_tmp.
  // > Retorna { id_turno }.
  static async crear(datosTurno, idUsuario) {
    try {
      const {
        id_paciente, dia, horario, cobertura, situacion, detalle, primera_vez,
        paciente_nombre_tmp, paciente_apellido_tmp
      } = datosTurno;

      const result = await pool.query(
        `INSERT INTO turnos (
          id_usuario, id_paciente, dia, horario, cobertura, situacion, detalle, primera_vez,
          paciente_nombre_tmp, paciente_apellido_tmp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id_turno`,
        [idUsuario, id_paciente || null, dia, horario, cobertura, situacion || 'programado', detalle, primera_vez || false,
         paciente_nombre_tmp || null, paciente_apellido_tmp || null]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * actualizar(id, datosTurno)
  // > Permite actualizar información clínica/operativa del turno (incl. vincular id_consulta).
  static async actualizar(id, datosTurno, idUsuario) {
    try {
      const {
        dia, horario, cobertura, hora_llegada, situacion, detalle, primera_vez, id_consulta
      } = datosTurno;

      const result = await pool.query(
        `UPDATE turnos SET 
         dia = $1, horario = $2, cobertura = $3, hora_llegada = $4,
         situacion = $5, detalle = $6, primera_vez = $7, id_consulta = $8,
         fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_turno = $9 AND id_usuario = $10
         RETURNING *`,
        [dia, horario, cobertura, hora_llegada, situacion, detalle, primera_vez, id_consulta, id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * eliminar(id)
  // ! Delete físico del turno. Retorna { id_turno } o undefined si no existe.
  static async eliminar(id, idUsuario) {
    try {
      const result = await pool.query(
        'DELETE FROM turnos WHERE id_turno = $1 AND id_usuario = $2 RETURNING id_turno',
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * marcarSituacion(id, situacion, horaLlegada = null)
  // ? Cambia estado operativo (p.ej. en_sala/atendido) y opcionalmente setea hora_llegada.
  static async marcarSituacion(id, situacion, horaLlegada = null, idUsuario) {
    try {
      const result = await pool.query(
        `UPDATE turnos SET 
         situacion = $1, 
         hora_llegada = $2,
         fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_turno = $3 AND id_usuario = $4
         RETURNING *`,
        [situacion, horaLlegada, id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * obtenerHoy()
  // > Lista los turnos del día actual del servidor (CURRENT_DATE), ordenados por horario.
  static async obtenerHoy(idUsuario) {
    try {
      const result = await pool.query(
  `SELECT t.*, 
    COALESCE(p.nombre, t.paciente_nombre_tmp) AS nombre,
    COALESCE(p.apellido, t.paciente_apellido_tmp) AS apellido,
    p.dni, p.telefono, p.cobertura AS cobertura_paciente
         FROM turnos t
         LEFT JOIN pacientes p ON t.id_paciente = p.id_paciente AND p.activo = true
         WHERE t.dia = CURRENT_DATE AND t.id_usuario = $1
         ORDER BY t.horario`
      , [idUsuario]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Turno;