import {
  ETIQUETA_COMPONENTE,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  formatearFecha
} from '../constants/catalogos.js';

export function IncidenciaList({ incidencias, cargando, onSeleccionarIncidencia, onFiltrarPuesto }) {
  if (cargando) {
    return <div className="empty-state">Cargando incidencias del laboratorio...</div>;
  }

  if (incidencias.length === 0) {
    return (
      <div className="empty-state">
        No hay incidencias que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Puesto</th>
            <th>Componente & Síntoma</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Técnico</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {incidencias.map((ticket) => (
            <tr
              key={ticket.id}
              className="ticket-row"
              onClick={() => onSeleccionarIncidencia(ticket.id)}
            >
              <td>
                <button
                  type="button"
                  className="btn btn-ghost mono"
                  style={{ padding: '2px 8px', fontSize: '0.82rem' }}
                  title={`Ver todas las incidencias de ${ticket.puestoId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFiltrarPuesto(ticket.puestoId);
                  }}
                >
                  {ticket.puestoId}
                </button>
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>
                  {ETIQUETA_COMPONENTE[ticket.componente] ?? ticket.componente}
                  {ticket.requiereRepuesto ? (
                    <span
                      className="badge badge-estado-ESPERANDO_REPUESTO"
                      style={{ marginLeft: 8 }}
                    >
                      Repuesto
                    </span>
                  ) : null}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 2 }}>
                  {ticket.sintoma}
                </div>
              </td>
              <td>
                <span className={`badge badge-prio-${ticket.prioridad}`}>
                  {ETIQUETA_PRIORIDAD[ticket.prioridad] ?? ticket.prioridad}
                </span>
              </td>
              <td>
                <span className={`badge badge-estado-${ticket.estado}`}>
                  {ETIQUETA_ESTADO[ticket.estado] ?? ticket.estado}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>
                {ticket.tecnicoAsignado ?? 'Sin asignar'}
              </td>
              <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatearFecha(ticket.fechaCreacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
