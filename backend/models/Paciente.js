// * Modelo: Paciente
// * Responsable de las operaciones CRUD sobre la tabla `pacientes`.
// * Patrón: Active Record sencillo usando `pg` con Pool compartido.
// ? Todas las consultas filtran por `activo = true` cuando corresponde (soft-delete).
// ! Errores: cualquier fallo en DB se propaga y debe ser capturado por el controlador.
const pool = require('../db/connection');

class Paciente {
  // * obtenerTodos()
  // > Lista todos los pacientes activos, ordenados por Apellido, Nombre.
  // ! Retorna un array vacío si no hay registros.
  static async obtenerTodos(idUsuario) {
    try {
      const result = await pool.query(
  `SELECT id_paciente, nombre, apellido, dni, fecha_nacimiento, sexo, 
   telefono, telefono_adicional, email, cobertura, plan, numero_afiliado, localidad, direccion, 
         ocupacion, fecha_registro 
         FROM pacientes 
         WHERE activo = true AND id_usuario = $1 
         ORDER BY apellido, nombre`
      , [idUsuario]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorId(id)
  // ? Parámetros: id (number)
  // > Devuelve el paciente activo con ese id o undefined si no existe.
  static async buscarPorId(id, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT * FROM pacientes WHERE id_paciente = $1 AND activo = true AND id_usuario = $2`,
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * buscarPorDni(dni)
  // ? Parámetros: dni (string | number)
  // > Devuelve el paciente activo con ese DNI o undefined si no existe.
  static async buscarPorDni(dni, idUsuario) {
    try {
      const result = await pool.query(
  'SELECT * FROM pacientes WHERE dni = $1 AND activo = true AND id_usuario = $2',
        [dni, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * buscar(termino)
  // ? Parámetros: termino (string) - se usa en LIKE contra nombre, apellido y dni
  // > Devuelve pacientes activos que coinciden con el término (case-insensitive), ordenados.
  static async buscar(termino, idUsuario) {
    try {
      const result = await pool.query(
        `SELECT id_paciente, nombre, apellido, dni, fecha_nacimiento, sexo, 
      telefono, telefono_adicional, email, cobertura, plan 
         FROM pacientes 
         WHERE activo = true AND id_usuario = $2
         AND (LOWER(nombre) LIKE LOWER($1) 
              OR LOWER(apellido) LIKE LOWER($1) 
              OR dni LIKE $1)
         ORDER BY apellido, nombre`,
        [`%${termino}%`, idUsuario]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // * crear(datospaciente)
  // ? Requiere: nombre, apellido (y opcionalmente el resto de campos). DNI puede ser null.
  // > Inserta un paciente completo. Retorna { id_paciente } del nuevo registro.
  // ! Validaciones de negocio (unicidad DNI, etc.) deben hacerse en controlador/DB.
  static async crear(datospaciente, idUsuario) {
    try {
      const {
        nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      } = datospaciente;

      const result = await pool.query(
        `INSERT INTO pacientes (
          id_usuario, nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
          cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
          enfermedades_preexistentes, alergias, observaciones,
          pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING id_paciente`,
        [
          idUsuario, nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
          cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
          enfermedades_preexistentes, alergias, observaciones,
          pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * crearMinimo({ nombre, apellido })
  // > Inserta un paciente sólo con nombre y apellido. Útil para alta rápida.
  // > Retorna { id_paciente, nombre, apellido }.
  static async crearMinimo({ nombre, apellido }, idUsuario) {
    try {
      const result = await pool.query(
        `INSERT INTO pacientes (id_usuario, nombre, apellido) VALUES ($1, $2, $3) RETURNING id_paciente, nombre, apellido`,
        [idUsuario, nombre, apellido]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * actualizar(id, datospaciente)
  // ? Parámetros: id (number), datospaciente (objeto con los mismos campos que crear)
  // > Retorna el registro actualizado o undefined si no existe o está inactivo.
  static async actualizar(id, datospaciente, idUsuario) {
    try {
      const {
        nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      } = datospaciente;

      const result = await pool.query(
        `UPDATE pacientes SET 
         nombre = $1, apellido = $2, dni = $3, fecha_nacimiento = $4, 
         sexo = $5, telefono = $6, telefono_adicional = $7, email = $8, cobertura = $9, plan = $10,
         numero_afiliado = $11, localidad = $12, direccion = $13, ocupacion = $14,
         enfermedades_preexistentes = $15, alergias = $16, observaciones = $17,
         pa = $18, pmin = $19, pmax = $20, imc = $21, t = $22, pposible = $23, medicacion = $24, ejercicio_fisico = $25
         WHERE id_paciente = $26 AND activo = true AND id_usuario = $27
         RETURNING *`,
        [
          nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
          cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
          enfermedades_preexistentes, alergias, observaciones,
          pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico,
          id, idUsuario
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // * eliminar(id)
  // > Soft-delete: marca `activo = false`. Retorna { id_paciente } o undefined si no existe.
  static async eliminar(id, idUsuario) {
    try {
      const result = await pool.query(
        'UPDATE pacientes SET activo = false WHERE id_paciente = $1 AND id_usuario = $2 RETURNING id_paciente',
        [id, idUsuario]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Paciente;