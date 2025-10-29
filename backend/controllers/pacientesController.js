const Paciente = require('../models/Paciente');

// ! Controlador: Pacientes
// ? Lógica de negocio para CRUD de pacientes y búsquedas
const pacientesController = {
  // GET /api/pacientes
  // * Lista pacientes (con query buscar opcional)
  obtenerPacientes: async (req, res) => {
    try {
      const { buscar } = req.query;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      
      let pacientes;
      if (buscar) {
        pacientes = await Paciente.buscar(buscar, idUsuario);
      } else {
        pacientes = await Paciente.obtenerTodos(idUsuario);
      }

      res.json(pacientes);
    } catch (error) {
      console.error('Error al obtener pacientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pacientes/:id
  // * Obtiene paciente por ID
  obtenerPacientePorId: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const paciente = await Paciente.buscarPorId(id, idUsuario);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json(paciente);
    } catch (error) {
      console.error('Error al obtener paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/pacientes
  // * Crea paciente con datos completos (requiere nombre y apellido)
  crearPaciente: async (req, res) => {
    try {
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      } = req.body;

      // Validaciones básicas
      if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
      }

      const normalizar = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
      const dniNorm = normalizar(dni);
      const fechaNacNorm = normalizar(fecha_nacimiento);

      // Verificar si el DNI ya existe (sólo si se envió DNI)
      if (dniNorm) {
        const pacienteExistente = await Paciente.buscarPorDni(dniNorm, idUsuario);
        if (pacienteExistente) {
          return res.status(409).json({ error: 'Paciente ya registrado con este DNI' });
        }
      }

      const nuevoPaciente = await Paciente.crear({
        nombre, apellido, dni: dniNorm, fecha_nacimiento: fechaNacNorm, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      }, idUsuario);

      res.status(201).json({
        mensaje: 'Paciente creado exitosamente',
        id_paciente: nuevoPaciente.id_paciente
      });

    } catch (error) {
      console.error('Error al crear paciente:', error);
      if (error.code === '23505') { // Código de PostgreSQL para violación de unique constraint
        res.status(409).json({ error: 'Paciente ya registrado con este DNI' });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  },

  // POST /api/pacientes/minimo - crear paciente con solo nombre y apellido
  // * Crea paciente mínimo (sólo nombre y apellido)
  crearPacienteMinimo: async (req, res) => {
    try {
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const { nombre, apellido } = req.body;
      if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
      }
      const nuevo = await Paciente.crearMinimo({ nombre, apellido }, idUsuario);
      res.status(201).json({ id_paciente: nuevo.id_paciente, nombre: nuevo.nombre, apellido: nuevo.apellido });
    } catch (error) {
      console.error('Error al crear paciente mínimo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/pacientes/:id
  // * Actualiza datos de un paciente (requiere nombre y apellido)
  actualizarPaciente: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        nombre, apellido, dni, fecha_nacimiento, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      } = req.body;

      // Validaciones básicas
      if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
      }

      const normalizar = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
      const dniNorm = normalizar(dni);
      const fechaNacNorm = normalizar(fecha_nacimiento);

      const pacienteActualizado = await Paciente.actualizar(id, {
        nombre, apellido, dni: dniNorm, fecha_nacimiento: fechaNacNorm, sexo, telefono, telefono_adicional, email,
        cobertura, plan, numero_afiliado, localidad, direccion, ocupacion,
        enfermedades_preexistentes, alergias, observaciones,
        pa, pmin, pmax, imc, t, pposible, medicacion, ejercicio_fisico
      }, idUsuario);

      if (!pacienteActualizado) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json({
        mensaje: 'Paciente actualizado exitosamente',
        paciente: pacienteActualizado
      });

    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      if (error.code === '23505') {
        res.status(409).json({ error: 'Ya existe otro paciente con este DNI' });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  },

  // DELETE /api/pacientes/:id
  // * Elimina (soft) un paciente por ID
  eliminarPaciente: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const pacienteEliminado = await Paciente.eliminar(id, idUsuario);
      
      if (!pacienteEliminado) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json({ mensaje: 'Paciente eliminado exitosamente' });

    } catch (error) {
      console.error('Error al eliminar paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pacientes/buscar/:dni
  // * Busca paciente por DNI exacto
  buscarPorDni: async (req, res) => {
    try {
      const { dni } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const paciente = await Paciente.buscarPorDni(dni, idUsuario);

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json(paciente);
    } catch (error) {
      console.error('Error al buscar paciente por DNI:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = pacientesController;