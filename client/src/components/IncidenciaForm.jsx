import { useEffect, useState } from 'react';
import { COMPONENTES, ESTADOS_ACTIVOS, PRIORIDADES } from '../constants/catalogos.js';

export function IncidenciaForm({ incidenciasExistentes, puestoInicial = '', onCrear }) {
  const [puestoId, setPuestoId] = useState(puestoInicial);
  const [componente, setComponente] = useState('RAM');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [sintoma, setSintoma] = useState('');
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');
  const [requiereRepuesto, setRequiereRepuesto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => {
    if (puestoInicial) {
      setPuestoId(puestoInicial);
    }
  }, [puestoInicial]);

  const puestoNormalizado = puestoId.trim().toUpperCase();
  const posibleDuplicado = incidenciasExistentes.find(
    (item) =>
      item.puestoId === puestoNormalizado &&
      item.componente === componente &&
      ESTADOS_ACTIVOS.has(item.estado)
  );

  async function manejarSubmit(event) {
    event.preventDefault();
    setErrorForm('');

    if (!puestoNormalizado || !sintoma.trim()) {
      setErrorForm('Ingresá el identificador del puesto y el síntoma observado.');
      return;
    }

    setEnviando(true);
    try {
      await onCrear({
        puestoId: puestoNormalizado,
        componente,
        prioridad,
        sintoma: sintoma.trim(),
        tecnicoAsignado: tecnicoAsignado.trim() || null,
        requiereRepuesto
      });
      setPuestoId(puestoInicial);
      setSintoma('');
      setRequiereRepuesto(false);
    } catch (error) {
      setErrorForm(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <aside className="panel" aria-label="Registrar nueva incidencia">
      <div className="panel-header">
        <h2>Registrar incidencia</h2>
      </div>

      <form onSubmit={manejarSubmit} noValidate>
        {errorForm ? (
          <div className="alert alert-error" role="alert">
            {errorForm}
          </div>
        ) : null}

        {posibleDuplicado ? (
          <div className="alert alert-warning" role="status">
            Ya existe una incidencia activa para <strong className="mono">{puestoNormalizado}</strong> en{' '}
            <strong>{componente}</strong> ({posibleDuplicado.estado}). Verificá antes de duplicar.
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="alta-puesto">Puesto / Equipo *</label>
          <input
            id="alta-puesto"
            type="text"
            className="input mono"
            placeholder="Ej: LAB1-PC08"
            maxLength={40}
            value={puestoId}
            onChange={(e) => setPuestoId(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="alta-componente">Componente afectado *</label>
          <select
            id="alta-componente"
            className="select"
            value={componente}
            onChange={(e) => setComponente(e.target.value)}
          >
            {COMPONENTES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="alta-prioridad">Prioridad</label>
          <select
            id="alta-prioridad"
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

        <div className="field">
          <label htmlFor="alta-sintoma">Síntoma técnico observado *</label>
          <textarea
            id="alta-sintoma"
            className="textarea"
            placeholder="Describí pitidos POST, voltajes, errores SMART o falla reportada..."
            maxLength={1000}
            value={sintoma}
            onChange={(e) => setSintoma(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="alta-tecnico">Técnico / Reportado por</label>
          <input
            id="alta-tecnico"
            type="text"
            className="input"
            placeholder="Ej: Tiziano Espinoza"
            maxLength={80}
            value={tecnicoAsignado}
            onChange={(e) => setTecnicoAsignado(e.target.value)}
          />
        </div>

        <label className="checkbox-row" htmlFor="alta-repuesto">
          <input
            id="alta-repuesto"
            type="checkbox"
            checked={requiereRepuesto}
            onChange={(e) => setRequiereRepuesto(e.target.checked)}
          />
          <span>Requiere adquisición / recambio de repuesto</span>
        </label>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrar ticket'}
        </button>
      </form>
    </aside>
  );
}
