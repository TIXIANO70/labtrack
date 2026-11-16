import { formatearFecha } from '../constants/catalogos.js';

const ETIQUETA_ESTADO_PUESTO = {
  OPERATIVO: 'Operativo',
  CON_FALLA: 'Con falla activa',
  BAJA: 'Dado de baja'
};

export function PuestosGrid({ puestos, onSeleccionarPuesto }) {
  if (puestos.length === 0) {
    return (
      <div className="empty-state">
        Todavía no hay puestos registrados con historial de incidencias.
      </div>
    );
  }

  return (
    <div className="puestos-grid">
      {puestos.map((puesto) => (
        <button
          key={puesto.puestoId}
          type="button"
          className={`puesto-card estado-${puesto.estadoPuesto}`}
          onClick={() => onSeleccionarPuesto(puesto.puestoId)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <strong className="mono">{puesto.puestoId}</strong>
            {puesto.reincidente ? (
              <span className="badge badge-prio-CRITICA">Reincidente</span>
            ) : null}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            {ETIQUETA_ESTADO_PUESTO[puesto.estadoPuesto] ?? puesto.estadoPuesto}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Activas: <strong>{puesto.activas}</strong> · Históricas: <strong>{puesto.totalIncidencias}</strong>
          </div>
          <div className="mono" style={{ marginTop: 4, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Última: {formatearFecha(puesto.ultimaIncidencia)}
          </div>
        </button>
      ))}
    </div>
  );
}
