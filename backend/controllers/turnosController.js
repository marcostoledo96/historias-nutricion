const Turno = require('../models/Turno');

// ! Controlador: Turnos
// ? Lógica para manejar turnos (listado, creación, actualización, situación)
const turnosController = {
  // GET /api/turnos
  // * Lista turnos (hoy=true, por día, por paciente o todos)
  obtenerTurnos: async (req, res) => {
    try {
      const { dia, paciente, hoy } = req.query;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      
      let turnos;
      if (hoy === 'true') {
        turnos = await Turno.obtenerHoy(idUsuario);
      } else if (dia) {
        turnos = await Turno.obtenerPorDia(dia, idUsuario);
      } else if (paciente) {
        turnos = await Turno.obtenerPorPaciente(paciente, idUsuario);
      } else {
        turnos = await Turno.obtenerTodos(idUsuario);
      }

      res.json(turnos);
    } catch (error) {
      console.error('Error al obtener turnos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/turnos/:id
  // * Obtiene un turno por ID
  obtenerTurnoPorId: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const turno = await Turno.buscarPorId(id, idUsuario);

      if (!turno) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json(turno);
    } catch (error) {
      console.error('Error al obtener turno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/turnos/dia/:dia
  // * Lista turnos por un día YYYY-MM-DD (path param)
  obtenerTurnosPorDia: async (req, res) => {
    try {
      const { dia } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const turnos = await Turno.obtenerPorDia(dia, idUsuario);

      res.json(turnos);
    } catch (error) {
      console.error('Error al obtener turnos del día:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/turnos/hoy
  // * Lista turnos de hoy
  obtenerTurnosHoy: async (req, res) => {
    try {
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const turnos = await Turno.obtenerHoy(idUsuario);
      res.json(turnos);
    } catch (error) {
      console.error('Error al obtener turnos de hoy:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/turnos/paciente/:id_paciente
  // * Lista turnos por paciente (path param)
  obtenerTurnosPorPaciente: async (req, res) => {
    try {
      const { id_paciente } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const turnos = await Turno.obtenerPorPaciente(id_paciente, idUsuario);

      res.json(turnos);
    } catch (error) {
      console.error('Error al obtener turnos del paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/turnos
  // * Crea turno (requiere dia y horario; si no hay id_paciente, pedir nombre/apellido tmp)
  crearTurno: async (req, res) => {
    try {
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        id_paciente, dia, horario, cobertura, situacion, detalle, primera_vez,
        paciente_nombre_tmp, paciente_apellido_tmp
      } = req.body;

      // Validaciones básicas
      if (!dia || !horario) {
        return res.status(400).json({ error: 'Día y horario son requeridos' });
      }

      // Si no viene id_paciente, exigir nombre y apellido temporales
      let idPacienteVal = id_paciente || null;
      let nombreTmp = paciente_nombre_tmp || null;
      let apellidoTmp = paciente_apellido_tmp || null;
      if (!idPacienteVal) {
        if (!nombreTmp || !apellidoTmp) {
          return res.status(400).json({ error: 'Si no se especifica paciente, se requieren nombre y apellido' });
        }
      }

      const nuevoTurno = await Turno.crear({
        id_paciente: idPacienteVal, dia, horario, cobertura, situacion, detalle, primera_vez,
        paciente_nombre_tmp: nombreTmp, paciente_apellido_tmp: apellidoTmp
      }, idUsuario);

      res.status(201).json({
        mensaje: 'Turno creado exitosamente',
        id_turno: nuevoTurno.id_turno
      });

    } catch (error) {
      console.error('Error al crear turno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/turnos/:id
  // * Actualiza turno (requiere dia y horario; normaliza campos opcionales)
  actualizarTurno: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        dia, horario, cobertura, hora_llegada, situacion, detalle, primera_vez, id_consulta
      } = req.body;

      // Validaciones básicas
      if (!dia || !horario) {
        return res.status(400).json({ 
          error: 'Día y horario son requeridos' 
        });
      }

      // Normalizar valores opcionales: convertir strings vacíos a null (especialmente hora_llegada -> TIME)
      const normalize = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
      const turnoActualizado = await Turno.actualizar(id, {
        dia,
        horario,
        cobertura: cobertura,
        hora_llegada: normalize(hora_llegada),
        situacion,
        detalle,
        primera_vez,
        id_consulta: normalize(id_consulta)
      }, idUsuario);

      if (!turnoActualizado) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json({
        mensaje: 'Turno actualizado exitosamente',
        turno: turnoActualizado
      });

    } catch (error) {
      console.error('Error al actualizar turno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // DELETE /api/turnos/:id
  // * Elimina turno por ID
  eliminarTurno: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const turnoEliminado = await Turno.eliminar(id, idUsuario);
      
      if (!turnoEliminado) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json({ mensaje: 'Turno eliminado exitosamente' });

    } catch (error) {
      console.error('Error al eliminar turno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/turnos/:id/situacion
  // * Actualiza situación del turno (programado/en_espera/atendido/ausente/cancelado)
  marcarSituacion: async (req, res) => {
    try {
      const { id } = req.params;
      const { situacion, hora_llegada } = req.body;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });

      // Validación de situaciones permitidas
      const situacionesPermitidas = ['programado', 'en_espera', 'atendido', 'ausente', 'cancelado'];
      if (!situacionesPermitidas.includes(situacion)) {
        return res.status(400).json({ 
          error: 'Situación no válida. Valores permitidos: ' + situacionesPermitidas.join(', ')
        });
      }

  const turnoActualizado = await Turno.marcarSituacion(id, situacion, hora_llegada, idUsuario);

      if (!turnoActualizado) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json({
        mensaje: `Turno marcado como ${situacion}`,
        turno: turnoActualizado
      });

    } catch (error) {
      console.error('Error al marcar situación del turno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = turnosController;