import { randomUUID } from 'node:crypto';
import {
  COMPONENTES,
  ESTADOS,
  ESTADOS_TERMINALES,
  LIMITES_CAMPO,
  NotFoundError,
  PRIORIDADES,
  UMBRAL_REINCIDENCIA_PUESTO,
  ValidationError,
  crearEntidadIncidencia
} from '../models/incidencia.js';
import {
  asegurarObjetoPayload,
  escaparCeldaCsv,
  normalizarFiltrosConsulta,
  validarBooleano,
  validarEnum,
  validarTexto
} from '../utils/validacion.js';

const CATALOGOS_FILTRO = {
  componentes: COMPONENTES,
  estados: ESTADOS,
  prioridades: PRIORIDADES
};

const LIMITE_EXPORTACION_CSV = 10000;

/**
 * Servicio de dominio que centraliza las reglas de negocio de Incidencias.
 */
export class IncidenciaService {
  #incidenciaRepository;

  /**
   * @param {object} dependencias
   * @param {import('../repositories/incidenciaRepository.js').IncidenciaRepository} dependencias.incidenciaRepository
   */
  constructor({ incidenciaRepository }) {
    this.#incidenciaRepository = incidenciaRepository;
  }

  registrarIncidencia(payload) {
    const datos = asegurarObjetoPayload(payload);
    const puestoId = validarTexto(datos.puestoId, 'puestoId', LIMITES_CAMPO.puestoId, {
      obligatorio: true,
      mayusculas: true
    });
    const componente = validarEnum(datos.componente, COMPONENTES, 'componente');
    const sintoma = validarTexto(datos.sintoma, 'sintoma', LIMITES_CAMPO.sintoma, {
      obligatorio: true,
      multilinea: true
    });
    const prioridad = validarEnum(datos.prioridad, PRIORIDADES, 'prioridad', 'MEDIA');
    const requiereRepuesto = validarBooleano(datos.requiereRepuesto, 'requiereRepuesto', false);
    const tecnicoAsignado = validarTexto(
      datos.tecnicoAsignado,
      'tecnicoAsignado',
      LIMITES_CAMPO.tecnicoAsignado
    );
    const diagnosticoNotas = validarTexto(
      datos.diagnosticoNotas,
      'diagnosticoNotas',
      LIMITES_CAMPO.diagnosticoNotas,
      { multilinea: true }
    );

    const ahora = new Date().toISOString();
    const nuevaIncidencia = crearEntidadIncidencia({
      id: randomUUID(),
      puestoId,
      componente,
      sintoma,
      prioridad,
      estado: 'PENDIENTE',
      tecnicoAsignado,
      diagnosticoNotas,
      requiereRepuesto,
      fechaCreacion: ahora,
      fechaResolucion: null
    });

    const eventoInicial = {
      incidenciaId: nuevaIncidencia.id,
      tipoEvento: 'CREACION',
      estadoAnterior: null,
      estadoNuevo: 'PENDIENTE',
      nota: `Alta en ${puestoId} (${componente}): ${sintoma}`,
      autor: tecnicoAsignado ?? 'Operador',
      fecha: ahora
    };

    return this.#incidenciaRepository.crear(nuevaIncidencia, eventoInicial);
  }

  listarIncidencias(query = {}) {
    const filtros = normalizarFiltrosConsulta(query, CATALOGOS_FILTRO);
    const { items } = this.#incidenciaRepository.listar(filtros);
    return items;
  }

  listarIncidenciasConTotal(query = {}) {
    const filtros = normalizarFiltrosConsulta(query, CATALOGOS_FILTRO);
    return this.#incidenciaRepository.listar(filtros);
  }

  obtenerIncidencia(id) {
    const idLimpio = validarTexto(id, 'id', 100, { obligatorio: true });
    const encontrada = this.#incidenciaRepository.obtenerPorId(idLimpio);
    if (!encontrada) {
      throw new NotFoundError('Incidencia no encontrada');
    }
    return encontrada;
  }

  actualizarIncidencia(id, payload) {
    const datos = asegurarObjetoPayload(payload);
    const actual = this.obtenerIncidencia(id);

    const camposEditables = ['estado', 'prioridad', 'tecnicoAsignado', 'diagnosticoNotas', 'requiereRepuesto'];
    if (!camposEditables.some((campo) => campo in datos)) {
      throw new ValidationError('Debes enviar al menos un campo modificable para actualizar');
    }

    const nuevoEstado =
      'estado' in datos ? validarEnum(datos.estado, ESTADOS, 'estado') : actual.estado;

    if (actual.estado === 'BAJA' && nuevoEstado === 'RESUELTO') {
      throw new ValidationError(
        'Un equipo dado de BAJA no puede pasar directo a RESUELTO; reabrilo primero a PENDIENTE o EN_DIAGNOSTICO'
      );
    }

    const cambios = {
      prioridad:
        'prioridad' in datos
          ? validarEnum(datos.prioridad, PRIORIDADES, 'prioridad')
          : actual.prioridad,
      estado: nuevoEstado,
      tecnicoAsignado:
        'tecnicoAsignado' in datos
          ? validarTexto(datos.tecnicoAsignado, 'tecnicoAsignado', LIMITES_CAMPO.tecnicoAsignado)
          : actual.tecnicoAsignado,
      diagnosticoNotas:
        'diagnosticoNotas' in datos
          ? validarTexto(datos.diagnosticoNotas, 'diagnosticoNotas', LIMITES_CAMPO.diagnosticoNotas, {
              multilinea: true
            })
          : actual.diagnosticoNotas,
      requiereRepuesto:
        'requiereRepuesto' in datos
          ? validarBooleano(datos.requiereRepuesto, 'requiereRepuesto', actual.requiereRepuesto)
          : actual.requiereRepuesto
    };

    const ahora = new Date().toISOString();
    cambios.fechaResolucion = calcularFechaResolucion(actual, nuevoEstado, ahora);

    const evento = construirEventoActualizacion(actual, cambios, ahora);
    if (!evento) {
      return actual;
    }

    return this.#incidenciaRepository.actualizar(actual.id, cambios, evento);
  }

  eliminarIncidencia(id) {
    const idLimpio = validarTexto(id, 'id', 100, { obligatorio: true });
    const eliminado = this.#incidenciaRepository.eliminar(idLimpio);
    if (!eliminado) {
      throw new NotFoundError('Incidencia no encontrada');
    }
    return { id: idLimpio, eliminado: true };
  }

  obtenerEstadisticas() {
    const resumen = this.#incidenciaRepository.obtenerEstadisticas();
    return {
      ...resumen,
      activas: resumen.pendientes + resumen.enDiagnostico + resumen.esperandoRepuesto
    };
  }

  obtenerResumenPuestos() {
    return this.#incidenciaRepository.obtenerAgregadoPuestos().map((fila) => ({
      ...fila,
      estadoPuesto:
        fila.bajas > 0 && fila.activas === 0
          ? 'BAJA'
          : fila.activas > 0
            ? 'CON_FALLA'
            : 'OPERATIVO',
      reincidente: fila.totalIncidencias >= UMBRAL_REINCIDENCIA_PUESTO
    }));
  }

  exportarCsv(query = {}) {
    const filtros = normalizarFiltrosConsulta(
      { ...query, offset: 0 },
      { ...CATALOGOS_FILTRO, limitePorDefecto: LIMITE_EXPORTACION_CSV, limiteMaximo: LIMITE_EXPORTACION_CSV }
    );
    const { items } = this.#incidenciaRepository.listar(filtros);
    const cabeceras = [
      'id',
      'puestoId',
      'componente',
      'sintoma',
      'prioridad',
      'estado',
      'tecnicoAsignado',
      'diagnosticoNotas',
      'requiereRepuesto',
      'fechaCreacion',
      'fechaResolucion'
    ];

    const filas = items.map((item) =>
      cabeceras.map((col) => escaparCeldaCsv(item[col])).join(',')
    );

    return `\uFEFF${cabeceras.join(',')}\n${filas.join('\n')}`;
  }

  verificarSaludBaseDatos() {
    this.#incidenciaRepository.ping();
  }
}

function calcularFechaResolucion(actual, nuevoEstado, ahoraIso) {
  if (ESTADOS_TERMINALES.has(nuevoEstado)) {
    return actual.estado === nuevoEstado && actual.fechaResolucion
      ? actual.fechaResolucion
      : ahoraIso;
  }
  return null;
}

function construirEventoActualizacion(actual, cambios, ahora) {
  const detalles = [];
  if (actual.estado !== cambios.estado) {
    detalles.push(`Estado: ${actual.estado} -> ${cambios.estado}`);
  }
  if (actual.prioridad !== cambios.prioridad) {
    detalles.push(`Prioridad: ${actual.prioridad} -> ${cambios.prioridad}`);
  }
  if (actual.tecnicoAsignado !== cambios.tecnicoAsignado) {
    detalles.push(`Técnico: ${cambios.tecnicoAsignado ?? 'Sin asignar'}`);
  }
  if (actual.requiereRepuesto !== cambios.requiereRepuesto) {
    detalles.push(cambios.requiereRepuesto ? 'Marcada para repuesto' : 'Repuesto no requerido');
  }
  if (actual.diagnosticoNotas !== cambios.diagnosticoNotas) {
    detalles.push(
      cambios.diagnosticoNotas ? `Diagnóstico: ${cambios.diagnosticoNotas}` : 'Notas de diagnóstico eliminadas'
    );
  }

  if (detalles.length === 0) {
    return null;
  }

  const tipoEvento =
    actual.estado !== cambios.estado
      ? 'CAMBIO_ESTADO'
      : actual.diagnosticoNotas !== cambios.diagnosticoNotas
        ? 'DIAGNOSTICO'
        : 'ACTUALIZACION';

  return {
    incidenciaId: actual.id,
    tipoEvento,
    estadoAnterior: actual.estado,
    estadoNuevo: cambios.estado,
    nota: detalles.join(' | '),
    autor: cambios.tecnicoAsignado ?? actual.tecnicoAsignado ?? 'Operador',
    fecha: ahora
  };
}
