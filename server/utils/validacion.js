import { LIMITES_CAMPO, ValidationError } from '../models/incidencia.js';

const CONTROL_UNA_LINEA_RE = /[\u0000-\u001F\u007F]/;
const CONTROL_MULTILINEA_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const FORMULA_CSV_RE = /^[=+\-@\t\r]/;

/**
 * Verifica que el payload sea un objeto plano JSON.
 *
 * @param {unknown} payload
 * @returns {Record<string, unknown>}
 */
export function asegurarObjetoPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('El cuerpo de la petición debe ser un objeto JSON válido');
  }
  return payload;
}

/**
 * Valida obligatoriedad y ausencia de caracteres de control sobre un texto.
 */
function limpiarCadena(valor, nombreCampo, obligatorio, multilinea) {
  if (typeof valor !== 'string') {
    throw new ValidationError(`El campo '${nombreCampo}' debe ser una cadena de texto`);
  }
  const regexControl = multilinea ? CONTROL_MULTILINEA_RE : CONTROL_UNA_LINEA_RE;
  if (regexControl.test(valor)) {
    throw new ValidationError(`El campo '${nombreCampo}' contiene caracteres de control no permitidos`);
  }
  const limpio = valor.trim();
  if (limpio.length === 0) {
    if (obligatorio) {
      throw new ValidationError(`El campo '${nombreCampo}' es obligatorio y no puede estar vacío`);
    }
    return null;
  }
  return limpio;
}

/**
 * Valida y sanitiza una cadena según obligatoriedad, longitud máxima y saltos de línea.
 *
 * @param {unknown} valor
 * @param {string} nombreCampo
 * @param {number} maxLen
 * @param {object} [opciones]
 * @returns {string | null}
 */
export function validarTexto(valor, nombreCampo, maxLen, opciones = {}) {
  const { obligatorio = false, mayusculas = false, multilinea = false } = opciones;

  if (valor === undefined || valor === null) {
    if (obligatorio) {
      throw new ValidationError(`El campo '${nombreCampo}' es obligatorio y no puede estar vacío`);
    }
    return null;
  }

  const limpio = limpiarCadena(valor, nombreCampo, obligatorio, multilinea);
  if (limpio === null) {
    return null;
  }

  if (limpio.length > maxLen) {
    throw new ValidationError(
      `El campo '${nombreCampo}' supera el máximo permitido de ${maxLen} caracteres`
    );
  }

  return mayusculas ? limpio.toUpperCase() : limpio;
}

/**
 * Valida un campo de catálogo cerrado (enum).
 *
 * @param {unknown} valor
 * @param {readonly string[]} catalogo
 * @param {string} nombreCampo
 * @param {string | null} [valorPorDefecto]
 * @returns {string | null}
 */
export function validarEnum(valor, catalogo, nombreCampo, valorPorDefecto = null) {
  if (valor === undefined || valor === null) {
    if (valorPorDefecto === null) {
      throw new ValidationError(`El campo '${nombreCampo}' es obligatorio y no puede estar vacío`);
    }
    return valorPorDefecto;
  }

  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new ValidationError(
      `El campo '${nombreCampo}' debe ser uno de: ${catalogo.join(', ')}`
    );
  }

  const normalizado = valor.trim().toUpperCase();
  if (!catalogo.includes(normalizado)) {
    throw new ValidationError(
      `El campo '${nombreCampo}' debe ser uno de: ${catalogo.join(', ')}`
    );
  }
  return normalizado;
}

/**
 * Valida un campo booleano estricto con valor por defecto opcional.
 *
 * @param {unknown} valor
 * @param {string} nombreCampo
 * @param {boolean} valorPorDefecto
 * @returns {boolean}
 */
export function validarBooleano(valor, nombreCampo, valorPorDefecto) {
  if (valor === undefined) {
    return valorPorDefecto;
  }
  if (typeof valor !== 'boolean') {
    throw new ValidationError(`El campo '${nombreCampo}' debe ser booleano`);
  }
  return valor;
}

/**
 * Valida enteros acotados para paginación de listados.
 *
 * @param {unknown} valor
 * @param {string} nombreCampo
 * @param {number} defecto
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function validarEnteroAcotado(valor, nombreCampo, defecto, min, max) {
  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw new ValidationError(`El parámetro '${nombreCampo}' debe ser numérico`);
  }
  const texto = String(valor).trim();
  if (!/^\d+$/.test(texto)) {
    throw new ValidationError(`El parámetro '${nombreCampo}' debe ser un entero positivo`);
  }
  const numero = Number.parseInt(texto, 10);
  if (numero < min || numero > max) {
    throw new ValidationError(
      `El parámetro '${nombreCampo}' debe estar entre ${min} y ${max}`
    );
  }
  return numero;
}

/**
 * Normaliza filtros opcionales para consultas y exportación CSV.
 *
 * @param {Record<string, unknown>} query
 * @param {{ componentes: readonly string[], estados: readonly string[], prioridades: readonly string[], limitePorDefecto?: number, limiteMaximo?: number }} catalogos
 * @returns {object}
 */
export function normalizarFiltrosConsulta(query = {}, catalogos) {
  const filtros = {};
  const { componentes, estados, prioridades, limitePorDefecto = 100, limiteMaximo = 200 } = catalogos;

  const puestoId = validarTexto(query.puestoId, 'puestoId', LIMITES_CAMPO.puestoId, {
    mayusculas: true
  });
  if (puestoId) {
    filtros.puestoId = puestoId;
  }

  for (const [clave, catalogo] of [
    ['estado', estados],
    ['componente', componentes],
    ['prioridad', prioridades]
  ]) {
    if (query[clave] !== undefined && query[clave] !== '') {
      filtros[clave] = validarEnum(query[clave], catalogo, clave);
    }
  }

  const q = validarTexto(query.q, 'q', LIMITES_CAMPO.busqueda);
  if (q) {
    filtros.q = q;
  }

  filtros.soloRepuestos = query.soloRepuestos === 'true' || query.soloRepuestos === true;
  filtros.soloActivas = query.soloActivas === 'true' || query.soloActivas === true;
  filtros.limit = validarEnteroAcotado(query.limit, 'limit', limitePorDefecto, 1, limiteMaximo);
  filtros.offset = validarEnteroAcotado(query.offset, 'offset', 0, 0, 100000);
  return filtros;
}

/**
 * Escapa un campo para CSV RFC 4180 neutralizando fórmulas maliciosas en hojas de cálculo.
 *
 * @param {unknown} valor
 * @returns {string}
 */
export function escaparCeldaCsv(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }
  let texto = String(valor);
  if (FORMULA_CSV_RE.test(texto)) {
    texto = `'${texto}`;
  }
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}
