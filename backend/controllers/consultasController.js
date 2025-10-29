const Consulta = require('../models/Consulta');

// ! Controlador: Consultas
// ? Maneja la lógica de negocio para CRUD de consultas
const consultasController = {
  // GET /api/consultas
  // * Lista consultas (todas, o filtradas por fecha/paciente vía query)
  obtenerConsultas: async (req, res) => {
    try {
      const { fecha, paciente } = req.query;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      
      let consultas;
      if (fecha) {
        consultas = await Consulta.buscarPorFecha(fecha, idUsuario);
      } else if (paciente) {
        consultas = await Consulta.obtenerPorPaciente(paciente, idUsuario);
      } else {
        consultas = await Consulta.obtenerTodas(idUsuario);
      }

      res.json(consultas);
    } catch (error) {
      console.error('Error al obtener consultas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/consultas/:id
  // * Obtiene una consulta por ID
  obtenerConsultaPorId: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const consulta = await Consulta.buscarPorId(id, idUsuario);

      if (!consulta) {
        return res.status(404).json({ error: 'Consulta no encontrada' });
      }

      res.json(consulta);
    } catch (error) {
      console.error('Error al obtener consulta:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/consultas/paciente/:id_paciente
  // * Lista consultas por ID de paciente (path param)
  obtenerConsultasPorPaciente: async (req, res) => {
    try {
      const { id_paciente } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const consultas = await Consulta.obtenerPorPaciente(id_paciente, idUsuario);

      res.json(consultas);
    } catch (error) {
      console.error('Error al obtener consultas del paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/consultas
  // * Crea una nueva consulta (requiere id_paciente y motivo_consulta)
  crearConsulta: async (req, res) => {
    try {
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        id_paciente, fecha, hora, motivo_consulta, informe_medico,
        diagnostico, tratamiento, estudios, archivo_adjunto
      } = req.body;

      // Validaciones básicas
      if (!id_paciente || !motivo_consulta) {
        return res.status(400).json({ 
          error: 'ID del paciente y motivo de consulta son requeridos' 
        });
      }

      const nuevaConsulta = await Consulta.crear({
        id_paciente, fecha, hora, motivo_consulta, informe_medico,
        diagnostico, tratamiento, estudios, archivo_adjunto
      }, idUsuario);

      res.status(201).json({
        mensaje: 'Consulta creada exitosamente',
        id_consulta: nuevaConsulta.id_consulta
      });

    } catch (error) {
      console.error('Error al crear consulta:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/consultas/:id
  // * Actualiza campos de una consulta (requiere motivo_consulta)
  actualizarConsulta: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const {
        motivo_consulta, informe_medico, diagnostico, tratamiento, estudios, archivo_adjunto
      } = req.body;

      // Validaciones básicas
      if (!motivo_consulta) {
        return res.status(400).json({ 
          error: 'Motivo de consulta es requerido' 
        });
      }

      const consultaActualizada = await Consulta.actualizar(id, {
        motivo_consulta, informe_medico, diagnostico, tratamiento, estudios, archivo_adjunto
      }, idUsuario);

      if (!consultaActualizada) {
        return res.status(404).json({ error: 'Consulta no encontrada' });
      }

      res.json({
        mensaje: 'Consulta actualizada exitosamente',
        consulta: consultaActualizada
      });

    } catch (error) {
      console.error('Error al actualizar consulta:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // DELETE /api/consultas/:id
  // * Elimina una consulta por ID
  eliminarConsulta: async (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const consultaEliminada = await Consulta.eliminar(id, idUsuario);
      
      if (!consultaEliminada) {
        return res.status(404).json({ error: 'Consulta no encontrada' });
      }

      res.json({ mensaje: 'Consulta eliminada exitosamente' });

    } catch (error) {
      console.error('Error al eliminar consulta:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/consultas/fecha/:fecha
  // * Lista consultas por fecha (YYYY-MM-DD)
  obtenerConsultasPorFecha: async (req, res) => {
    try {
      const { fecha } = req.params;
      const idUsuario = req.session?.usuario?.id;
      if (!idUsuario) return res.status(401).json({ error: 'No autenticado' });
      const consultas = await Consulta.buscarPorFecha(fecha, idUsuario);

      res.json(consultas);
    } catch (error) {
      console.error('Error al obtener consultas por fecha:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = consultasController;