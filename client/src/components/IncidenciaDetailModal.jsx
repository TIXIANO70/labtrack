import { useEffect, useState } from 'react';
import { ESTADOS, ETIQUETA_COMPONENTE, PRIORIDADES, formatearFecha } from '../constants/catalogos.js';
import { HistorialTimeline } from './HistorialTimeline.jsx';

export function IncidenciaDetailModal({ incidencia, onCerrar, onActualizar, onEliminar }) {
  const [estado, setEstado] = useState(incidencia.estado);
  const [prioridad, setPrioridad] = useState(incidencia.prioridad);
  const [tecnicoAsignado, setTecnicoAsignado] = useState(incidencia.tecnicoAsignado ?? '');
  const [diagnosticoNotas, setDiagnosticoNotas] = useState(incidencia.diagnosticoNotas ?? '');
  const [requiereRepuesto, setRequiereRepuesto] = useState(Boolean(incidencia.requiereRepuesto));
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [requierePin, setRequierePin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [errorModal, setErrorModal] = useState('');

  useEffect(() => {
    setEstado(incidencia.estado);
    setPrioridad(incidencia.prioridad);
    setTecnicoAsignado(incidencia.tecnicoAsignado ?? '');
    setDiagnosticoNotas(incidencia.diagnosticoNotas ?? '');
    setRequiereRepuesto(Boolean(incidencia.requiereRepuesto));
    setConfirmandoBorrado(false);
    setRequierePin(false);
    setAdminPin('');
    setErrorModal('');
  }, [incidencia]);

  useEffect(() => {
    const manejarTecla = (event) => {
      if (event.key === 'Escape') {
        onCerrar();
      }
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [onCerrar]);

  async function manejarGuardar(event) {
    event.preventDefault();
    setErrorModal('');
    setGuardando(true);
    try {
      await onActualizar(incidencia.id, {
        estado,
        prioridad,
        tecnicoAsignado: tecnicoAsignado.trim() || null,
        diagnosticoNotas: diagnosticoNotas.trim() || null,
        requiereRepuesto
      });
    } catch (error) {
      setErrorModal(error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    setErrorModal('');
    setGuardando(true);
    try {
      await onEliminar(incidencia.id, adminPin);
    } catch (error) {
      if (error.status === 403) {
        setRequierePin(true);
      }
      setErrorModal(error.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-ticket"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <div>
            <h2 id="modal-titulo-ticket">
              Diagnóstico — <span className="mono">{incidencia.puestoId}</span>
            </h2>
            <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              ID: {incidencia.id} ·{' '}
              {ETIQUETA_COMPONENTE[incidencia.componente] ?? incidencia.componente}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="alert" style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Síntoma inicial</div>
          <div>{incidencia.sintoma}</div>
          <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Alta: {formatearFecha(incidencia.fechaCreacion)} · Cierre:{' '}
            {formatearFecha(incidencia.fechaResolucion)}
          </div>
        </div>

        {errorModal ? (
          <div className="alert alert-error" role="alert">
            {errorModal}
          </div>
        ) : null}

        <form onSubmit={manejarGuardar}>
          <div className="modal-grid">
            <div className="field">
              <label htmlFor="detalle-estado">Estado operativo</label>
              <select
                id="detalle-estado"
                className="select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {ESTADOS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    disabled={incidencia.estado === 'BAJA' && item.value === 'RESUELTO'}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="detalle-prioridad">Prioridad</label>
              <select
                id="detalle-prioridad"
                className="select"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
              >
                {PRIORIDADES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="detalle-tecnico">Técnico asignado</label>
            <input
              id="detalle-tecnico"
              type="text"
              className="input"
              maxLength={80}
              placeholder="Ej: Tiziano Espinoza"
              value={tecnicoAsignado}
              onChange={(e) => setTecnicoAsignado(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="detalle-notas">Bitácora de diagnóstico y pruebas realizadas</label>
            <textarea
              id="detalle-notas"
              className="textarea"
              maxLength={2000}
              placeholder="Voltajes medidos, pruebas MemTest, repuestos sustituidos..."
              value={diagnosticoNotas}
              onChange={(e) => setDiagnosticoNotas(e.target.value)}
            />
          </div>

          <label className="checkbox-row" htmlFor="detalle-repuesto">
            <input
              id="detalle-repuesto"
              type="checkbox"
              checked={requiereRepuesto}
              onChange={(e) => setRequiereRepuesto(e.target.checked)}
            />
            <span>Requiere repuesto para finalizar reparación</span>
          </label>

          {requierePin ? (
            <div className="field">
              <label htmlFor="detalle-admin-pin">PIN administrativo de laboratorio</label>
              <input
                id="detalle-admin-pin"
                type="password"
                className="input mono"
                placeholder="Ingresá ADMIN_PIN configurado"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
            {!confirmandoBorrado ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={guardando}
                onClick={() => setConfirmandoBorrado(true)}
              >
                Eliminar registro
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="btn btn-danger" disabled={guardando} onClick={manejarEliminar}>
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={guardando}
                  onClick={() => setConfirmandoBorrado(false)}
                >
                  Cancelar
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar diagnóstico'}
            </button>
          </div>
        </form>

        <HistorialTimeline historial={incidencia.historial} />
      </div>
    </div>
  );
}
