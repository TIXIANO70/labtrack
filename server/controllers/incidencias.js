/**
 * Crea el controlador HTTP para el recurso `/api/incidencias`.
 * Traduce peticiones HTTP a llamadas del servicio de dominio sin alojar lógica de negocio.
 *
 * @param {object} dependencias
 * @param {import('../services/incidencias.js').IncidenciaService} dependencias.incidenciaService
 */
export function crearControladorIncidencias({ incidenciaService }) {
  return {
    listar(req, res) {
      const { items, total } = incidenciaService.listarIncidenciasConTotal(req.query);
      res.setHeader('X-Total-Count', String(total));
      res.status(200).json({ success: true, data: items });
    },

    obtenerEstadisticas(_req, res) {
      const data = incidenciaService.obtenerEstadisticas();
      res.status(200).json({ success: true, data });
    },

    obtenerResumenPuestos(_req, res) {
      const data = incidenciaService.obtenerResumenPuestos();
      res.status(200).json({ success: true, data });
    },

    exportarCsv(req, res) {
      const csv = incidenciaService.exportarCsv(req.query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="labtrack-incidencias.csv"');
      res.status(200).send(csv);
    },

    obtenerPorId(req, res) {
      const data = incidenciaService.obtenerIncidencia(req.params.id);
      res.status(200).json({ success: true, data });
    },

    registrar(req, res) {
      const data = incidenciaService.registrarIncidencia(req.body);
      res.status(201).json({ success: true, data });
    },

    actualizar(req, res) {
      const data = incidenciaService.actualizarIncidencia(req.params.id, req.body);
      res.status(200).json({ success: true, data });
    },

    eliminar(req, res) {
      const data = incidenciaService.eliminarIncidencia(req.params.id);
      res.status(200).json({ success: true, data });
    }
  };
}
