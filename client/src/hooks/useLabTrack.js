import { useCallback, useEffect, useRef, useState } from 'react';
import {
  actualizarIncidencia,
  crearIncidencia,
  eliminarIncidencia,
  listarIncidencias,
  obtenerEstadisticas,
  obtenerIncidencia,
  obtenerResumenPuestos,
  obtenerSalud
} from '../services/api.js';

export const FILTROS_INICIALES = {
  q: '',
  puestoId: '',
  estado: '',
  componente: '',
  prioridad: '',
  soloRepuestos: false,
  soloActivas: false,
  limit: 100
};

export function useLabTrack() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [vista, setVista] = useState('tickets');
  const [incidencias, setIncidencias] = useState([]);
  const [totalIncidencias, setTotalIncidencias] = useState(0);
  const [incidenciasActivas, setIncidenciasActivas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [puestos, setPuestos] = useState([]);
  const [detalleActivo, setDetalleActivo] = useState(null);
  const [saludApi, setSaludApi] = useState('verificando');
  const [cargando, setCargando] = useState(true);
  const [mensajeGlobal, setMensajeGlobal] = useState(null);
  const busquedaAnteriorRef = useRef(filtros.q);

  const cargarResumenGlobal = useCallback(async (signal) => {
    try {
      const [stats, mapaPuestos, salud, activasRes] = await Promise.all([
        obtenerEstadisticas({ signal }),
        obtenerResumenPuestos({ signal }),
        obtenerSalud({ signal }),
        listarIncidencias({ soloActivas: true, limit: 200 }, { signal })
      ]);
      setEstadisticas(stats);
      setPuestos(mapaPuestos);
      setIncidenciasActivas(activasRes.items);
      setSaludApi(salud?.database === 'ok' ? 'ok' : 'error');
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      setSaludApi('error');
      setMensajeGlobal({ tipo: 'error', texto: error.message });
    }
  }, []);

  const cargarListado = useCallback(async (filtrosActuales, signal) => {
    setCargando(true);
    try {
      const { items, total } = await listarIncidencias(filtrosActuales, { signal });
      setIncidencias(items);
      setTotalIncidencias(total);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      if (!error.status || error.status >= 500) {
        setSaludApi('error');
      }
      setMensajeGlobal({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarResumenGlobal(controller.signal);
    return () => controller.abort();
  }, [cargarResumenGlobal]);

  useEffect(() => {
    const controller = new AbortController();
    const cambioTexto = busquedaAnteriorRef.current !== filtros.q;
    busquedaAnteriorRef.current = filtros.q;
    const esperaMs = cambioTexto && filtros.q.length > 0 ? 180 : 0;

    const timer = setTimeout(() => {
      cargarListado(filtros, controller.signal);
    }, esperaMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filtros, cargarListado]);

  const refrescarTodo = useCallback(async () => {
    await Promise.all([cargarResumenGlobal(), cargarListado(filtros)]);
  }, [cargarResumenGlobal, cargarListado, filtros]);

  const cerrarDetalle = useCallback(() => setDetalleActivo(null), []);

  function actualizarFiltro(clave, valor) {
    setFiltros((prev) => ({
      ...prev,
      limit: FILTROS_INICIALES.limit,
      ...(clave === 'estado' && valor ? { soloActivas: false } : {}),
      [clave]: valor
    }));
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
  }

  function seleccionarEstadoDesdeCard(estado, extras = {}) {
    setVista('tickets');
    setFiltros((prev) => ({
      ...FILTROS_INICIALES,
      puestoId: prev.puestoId,
      estado,
      ...extras
    }));
  }

  async function manejarCrear(payload) {
    const creada = await crearIncidencia(payload);
    setMensajeGlobal({
      tipo: 'success',
      texto: `Incidencia registrada para ${creada.puestoId} (${creada.componente}).`
    });
    await refrescarTodo();
  }

  async function manejarAbrirDetalle(id) {
    try {
      const detalle = await obtenerIncidencia(id);
      setDetalleActivo(detalle);
    } catch (error) {
      setMensajeGlobal({ tipo: 'error', texto: error.message });
    }
  }

  async function manejarActualizar(id, payload) {
    const actualizada = await actualizarIncidencia(id, payload);
    setDetalleActivo(actualizada);
    setMensajeGlobal({
      tipo: 'success',
      texto: `Diagnóstico de ${actualizada.puestoId} actualizado (${actualizada.estado}).`
    });
    await refrescarTodo();
  }

  async function manejarEliminar(id, adminPin = '') {
    await eliminarIncidencia(id, adminPin);
    setDetalleActivo(null);
    setMensajeGlobal({ tipo: 'success', texto: 'Incidencia eliminada correctamente.' });
    await refrescarTodo();
  }

  return {
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
    cargarMas: () =>
      setFiltros((prev) => ({ ...prev, limit: Math.min(200, prev.limit + 100) })),
    refrescarTodo,
    cerrarDetalle,
    manejarCrear,
    manejarAbrirDetalle,
    manejarActualizar,
    manejarEliminar
  };
}
