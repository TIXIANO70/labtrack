import { formatearFecha } from '../constants/catalogos.js';

export function HistorialTimeline({ historial }) {
  if (!Array.isArray(historial) || historial.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: 18 }} aria-label="Historial cronológico de intervenciones">
      <h3 style={{ fontSize: '0.92rem', marginBottom: 4 }}>Bitácora de intervenciones</h3>
      <ul className="timeline">
        {historial.map((evento) => (
          <li key={evento.id}>
            <div>
              <strong>{evento.tipoEvento}</strong> · {evento.autor || 'Operador'}{' '}
              <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                ({formatearFecha(evento.fecha)})
              </span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{evento.nota}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
