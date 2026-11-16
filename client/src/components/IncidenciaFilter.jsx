import { COMPONENTES, ESTADOS, PRIORIDADES } from '../constants/catalogos.js';

export function IncidenciaFilter({ filtros, onActualizarFiltro, onLimpiarFiltros }) {
  const hayFiltros = Boolean(
    filtros.q ||
      filtros.puestoId ||
      filtros.estado ||
      filtros.componente ||
      filtros.prioridad ||
      filtros.soloRepuestos ||
      filtros.soloActivas
  );

  return (
    <div>
      <div className="filter-bar">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-busqueda">Buscar puesto, síntoma o técnico</label>
          <input
            id="filtro-busqueda"
            type="search"
            className="input"
            maxLength={100}
            placeholder="Ej: LAB1-PC08, RAM, MemTest..."
            value={filtros.q}
            onChange={(e) => onActualizarFiltro('q', e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-estado">Estado</label>
          <select
            id="filtro-estado"
            className="select"
            value={filtros.estado}
            onChange={(e) => onActualizarFiltro('estado', e.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-componente">Componente</label>
          <select
            id="filtro-componente"
            className="select"
            value={filtros.componente}
            onChange={(e) => onActualizarFiltro('componente', e.target.value)}
          >
            <option value="">Todos</option>
            {COMPONENTES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-prioridad">Prioridad</label>
          <select
            id="filtro-prioridad"
            className="select"
            value={filtros.prioridad}
            onChange={(e) => onActualizarFiltro('prioridad', e.target.value)}
          >
            <option value="">Todas</option>
            {PRIORIDADES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={!hayFiltros}
          onClick={onLimpiarFiltros}
        >
          Limpiar
        </button>
      </div>

      {filtros.puestoId ? (
        <div
          className="alert alert-warning"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            Filtrando historial del puesto <strong className="mono">{filtros.puestoId}</strong>
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onActualizarFiltro('puestoId', '')}
          >
            Quitar filtro de puesto
          </button>
        </div>
      ) : null}
    </div>
  );
}
