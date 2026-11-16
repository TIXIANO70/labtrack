import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const RAIZ_PROYECTO = resolve(__dirname, '..');

/**
 * Parsea una línea individual de `.env` devolviendo `[clave, valor]` o `null`.
 *
 * @param {string} lineaCruda
 * @returns {[string, string] | null}
 */
export function parsearLineaEnv(lineaCruda) {
  const linea = lineaCruda.trim();
  if (!linea || linea.startsWith('#')) {
    return null;
  }

  const sinExport = linea.startsWith('export ') ? linea.slice(7).trim() : linea;
  const indiceIgual = sinExport.indexOf('=');
  if (indiceIgual <= 0) {
    return null;
  }

  const clave = sinExport.slice(0, indiceIgual).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(clave)) {
    return null;
  }

  let valor = sinExport.slice(indiceIgual + 1).trim();
  const entreComillasDobles = valor.startsWith('"') && valor.endsWith('"');
  const entreComillasSimples = valor.startsWith("'") && valor.endsWith("'");
  if (entreComillasDobles || entreComillasSimples) {
    valor = valor.slice(1, -1);
  }
  return [clave, valor];
}

/**
 * Carga variables desde un archivo `.env` local en desarrollo si existe,
 * sin sobrescribir variables ya definidas en el entorno del sistema.
 *
 * @param {string} [rutaEnv]
 */
export function cargarEnvOpcional(rutaEnv = resolve(RAIZ_PROYECTO, '.env')) {
  if (!existsSync(rutaEnv)) {
    return;
  }

  const contenido = readFileSync(rutaEnv, 'utf8');
  for (const lineaCruda of contenido.split(/\r?\n/)) {
    const entrada = parsearLineaEnv(lineaCruda);
    if (entrada && !Object.prototype.hasOwnProperty.call(process.env, entrada[0])) {
      process.env[entrada[0]] = entrada[1];
    }
  }
}

/**
 * Parsea y valida el puerto TCP dentro del rango permitido (1..65535).
 *
 * @param {string | undefined} rawPort
 * @returns {number}
 */
export function parsearPuerto(rawPort) {
  const valorTexto = (rawPort ?? '3000').trim();
  if (!/^\d+$/.test(valorTexto)) {
    throw new Error(`Puerto inválido en PORT: "${valorTexto}"`);
  }

  const puerto = Number.parseInt(valorTexto, 10);
  if (puerto < 1 || puerto > 65535) {
    throw new Error(`Puerto fuera de rango (1-65535): ${puerto}`);
  }
  return puerto;
}

/**
 * Parsea orígenes CORS separados por coma desde configuración.
 *
 * @param {string | undefined} rawOrigins
 * @returns {string[] | boolean}
 */
export function parsearCorsOrigins(rawOrigins) {
  const texto = (rawOrigins ?? 'http://localhost:5173,http://127.0.0.1:5173').trim();
  if (texto === '*') {
    return true;
  }
  const lista = texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return lista.length > 0 ? lista : false;
}

/**
 * Construye y valida la configuración del servidor a partir del entorno.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function obtenerConfiguracion(env = process.env) {
  const port = parsearPuerto(env.PORT);
  const host = (env.HOST ?? '127.0.0.1').trim() || '127.0.0.1';
  const dbPathCrudo = (env.DB_PATH ?? './data/labtrack.db').trim();
  const dbPath =
    dbPathCrudo === ':memory:'
      ? ':memory:'
      : isAbsolute(dbPathCrudo)
        ? dbPathCrudo
        : resolve(RAIZ_PROYECTO, dbPathCrudo);
  const adminPin = (env.ADMIN_PIN ?? '').trim() || null;

  return {
    port,
    host,
    dbPath,
    corsOrigins: parsearCorsOrigins(env.CORS_ORIGIN),
    nodeEnv: (env.NODE_ENV ?? 'development').trim() || 'development',
    adminPin,
    clientDistPath: resolve(RAIZ_PROYECTO, 'client/dist')
  };
}
