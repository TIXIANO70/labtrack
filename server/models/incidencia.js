/**
 * Modelo de dominio, catálogos, límites y errores operacionales de LabTrack.
 */

export const COMPONENTES = Object.freeze([
  'MOTHERBOARD',
  'CPU',
  'RAM',
  'ALMACENAMIENTO',
  'FUENTE_PODER',
  'GPU',
  'PERIFERICO',
  'RED',
  'OTRO'
]);

export const PRIORIDADES = Object.freeze([
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA'
]);

export const ESTADOS = Object.freeze([
  'PENDIENTE',
  'EN_DIAGNOSTICO',
  'ESPERANDO_REPUESTO',
  'RESUELTO',
  'BAJA'
]);

export const ESTADOS_ACTIVOS = Object.freeze([
  'PENDIENTE',
  'EN_DIAGNOSTICO',
  'ESPERANDO_REPUESTO'
]);

export const ESTADOS_TERMINALES = new Set(['RESUELTO', 'BAJA']);

export const TIPOS_EVENTO = Object.freeze([
  'CREACION',
  'CAMBIO_ESTADO',
  'DIAGNOSTICO',
  'ACTUALIZACION'
]);

export const LIMITES_CAMPO = Object.freeze({
  puestoId: 40,
  sintoma: 1000,
  tecnicoAsignado: 80,
  diagnosticoNotas: 2000,
  busqueda: 100
});

export const UMBRAL_REINCIDENCIA_PUESTO = 3;

/**
 * Error operacional controlado para traducir fallas de dominio a códigos HTTP válidos.
 */
export class AppError extends Error {
  /**
   * @param {string} mensaje
   * @param {number} [statusCode]
   * @param {ErrorOptions} [opciones]
   */
  constructor(mensaje, statusCode = 500, opciones) {
    super(mensaje, opciones);
    this.name = this.constructor.name;
    this.statusCode =
      Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
        ? statusCode
        : 500;
  }
}

/**
 * Error de validación de datos de entrada o reglas de negocio (HTTP 400).
 */
export class ValidationError extends AppError {
  /**
   * @param {string} mensaje
   */
  constructor(mensaje) {
    super(mensaje, 400);
  }
}

/**
 * Error de recurso inexistente (HTTP 404).
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} [mensaje]
   */
  constructor(mensaje = 'Incidencia no encontrada') {
    super(mensaje, 404);
  }
}

/**
 * Construye una entidad normalizada de Incidencia desde datos de dominio o fila SQLite.
 *
 * @param {Record<string, any>} datos
 * @returns {object}
 */
export function crearEntidadIncidencia(datos) {
  return {
    id: datos.id,
    puestoId: datos.puestoId,
    componente: datos.componente,
    sintoma: datos.sintoma,
    prioridad: datos.prioridad,
    estado: datos.estado,
    tecnicoAsignado: datos.tecnicoAsignado ?? null,
    diagnosticoNotas: datos.diagnosticoNotas ?? null,
    requiereRepuesto: Boolean(datos.requiereRepuesto),
    fechaCreacion: datos.fechaCreacion,
    fechaResolucion: datos.fechaResolucion ?? null
  };
}
