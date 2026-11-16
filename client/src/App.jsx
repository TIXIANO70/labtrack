import { useMemo } from 'react';
import { construirUrlExportacionCsv } from './services/api.js';
import { FILTROS_INICIALES, useLabTrack } from './hooks/useLabTrack.js';
import { StatCards } from './components/StatCards.jsx';
import { IncidenciaForm } from './components/IncidenciaForm.jsx';
import { IncidenciaFilter } from './components/IncidenciaFilter.jsx';
import { IncidenciaList } from './components/IncidenciaList.jsx';
import { PuestosGrid } from './components/PuestosGrid.jsx';
import { IncidenciaDetailModal } from './components/IncidenciaDetailModal.jsx';

export function App() {
  const puestoDeUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('puesto') ?? '').trim().toUpperCase().slice(0, 40);
  }, []);

  const {
    filtros,
    vista,
    setVista,
    incidencias,
    totalIncidencias,
    incidenciasActivas,
    estadisticas,
    puestos,
    detalleActivo,
    saludApi,
    cargando,
    mensajeGlobal,
    setMensajeGlobal,
    actualizarFiltro,
    limpiarFiltros,
    seleccionarEstadoDesdeCard,
    cargarMas,
    refrescarTodo,
    cerrarDetalle,
    manejarCrear,
    manejarAbrirDetalle,
    manejarActualizar,
    manejarEliminar
  } = useLabTrack();

  const urlCsv = construirUrlExportacionCsv(filtros);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>LabTrack</h1>
          <p>Seguimiento de mantenimiento e incidencias de hardware en laboratorio</p>
        </div>

        <div className="topbar-actions">
          <span className="health-pill" title="Estado de la API REST y SQLite">
            <span className={`health-dot ${saludApi === 'ok' ? 'ok' : saludApi === 'error' ? 'error' : ''}`} />
            <span>
              {saludApi === 'ok'
                ? 'API + SQLite OK'
                : saludApi === 'error'
                  ? 'Sin conexión API'
                  : 'Conectando...'}
            </span>
          </span>

          <a className="btn" href={urlCsv} download="labtrack-incidencias.csv">
            Exportar CSV
          </a>

          <button type="button" className="btn btn-ghost" onClick={refrescarTodo}>
            Actualizar
          </button>
        </div>
      </header>

      {mensajeGlobal ? (
        <div
          className={`alert ${mensajeGlobal.tipo === 'error' ? 'alert-error' : 'alert-success'}`}
          role={mensajeGlobal.tipo === 'error' ? 'alert' : 'status'}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{mensajeGlobal.texto}</span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '2px 8px' }}
            onClick={() => setMensajeGlobal(null)}
          >
            ✕
          </button>
        </div>
      ) : null}

      <StatCards
        estadisticas={estadisticas}
        filtroEstadoActivo={filtros.estado}
        filtroPrioridadActivo={filtros.prioridad}
        soloRepuestos={filtros.soloRepuestos}
        soloActivas={filtros.soloActivas}
        onSeleccionarEstado={seleccionarEstadoDesdeCard}
        onAlternarRepuestos={() => {
          setVista('tickets');
          seleccionarEstadoDesdeCard('', {
            soloRepuestos: !filtros.soloRepuestos,
            soloActivas: false
          });
        }}
      />

      <div className="workspace-grid">
        <IncidenciaForm
          incidenciasExistentes={incidenciasActivas}
          puestoInicial={puestoDeUrl}
          onCrear={manejarCrear}
        />

        <main className="panel">
          <div className="panel-header">
            <h2>
              {vista === 'tickets'
                ? `Incidencias (${incidencias.length}${totalIncidencias > incidencias.length ? ` de ${totalIncidencias}` : ''})`
                : `Mapa de puestos (${puestos.length})`}
            </h2>

            <div className="tabs" role="tablist" aria-label="Vistas del tablero">
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'tickets'}
                className={`tab-btn${vista === 'tickets' ? ' active' : ''}`}
                onClick={() => setVista('tickets')}
              >
                Tickets
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'puestos'}
                className={`tab-btn${vista === 'puestos' ? ' active' : ''}`}
                onClick={() => setVista('puestos')}
              >
                Mapa de puestos
              </button>
            </div>
          </div>

          {vista === 'tickets' ? (
            <>
              <IncidenciaFilter
                filtros={filtros}
                onActualizarFiltro={actualizarFiltro}
                onLimpiarFiltros={limpiarFiltros}
              />
              <IncidenciaList
                incidencias={incidencias}
                cargando={cargando}
                onSeleccionarIncidencia={manejarAbrirDetalle}
                onFiltrarPuesto={(puestoId) => actualizarFiltro('puestoId', puestoId)}
              />
              {totalIncidencias > incidencias.length && filtros.limit < 200 ? (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button type="button" className="btn btn-ghost" onClick={cargarMas}>
                    Cargar más incidencias ({totalIncidencias - incidencias.length} restantes)
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <PuestosGrid
              puestos={puestos}
              onSeleccionarPuesto={(puestoId) => {
                setVista('tickets');
                seleccionarEstadoDesdeCard(FILTROS_INICIALES.estado, { puestoId });
              }}
            />
          )}
        </main>
      </div>

      {detalleActivo ? (
        <IncidenciaDetailModal
          incidencia={detalleActivo}
          onCerrar={cerrarDetalle}
          onActualizar={manejarActualizar}
          onEliminar={manejarEliminar}
        />
      ) : null}
    </div>
  );
}

export default App;
