import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cors from 'cors';
import express from 'express';
import { crearBaseDatos } from './db.js';
import { IncidenciaRepository } from './repositories/incidenciaRepository.js';
import { IncidenciaService } from './services/incidencias.js';
import { crearControladorIncidencias } from './controllers/incidencias.js';
import { crearRouterIncidencias } from './routes/incidencias.js';
import { crearGuardiaPinAdmin, crearRateLimiter } from './middlewares/security.js';
import {
  crearErrorHandler,
  responderRutaNoEncontrada
} from './middlewares/errorHandler.js';

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ');

/**
 * Aplica cabeceras de seguridad HTTP y registra métricas de latencia por petición.
 */
function crearMiddlewareSeguridadYLogs(logger) {
  return (req, res, next) => {
    res.setHeader('Content-Security-Policy', CSP_HEADER);
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }

    const inicioNs = process.hrtime.bigint();
    res.on('finish', () => {
      const duracionMs = Number(process.hrtime.bigint() - inicioNs) / 1_000_000;
      logger(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracionMs.toFixed(2)} ms)`);
    });
    next();
  };
}

/**
 * Construye la aplicación Express conectando todas las capas y recursos SQLite.
 *
 * @param {object} [opciones]
 * @param {string} [opciones.dbPath]
 * @param {string[] | boolean} [opciones.corsOrigins]
 * @param {string} [opciones.clientDistPath]
 * @param {string | null} [opciones.adminPin]
 * @param {number} [opciones.rateLimitMax]
 * @param {(linea: string) => void} [opciones.logger]
 * @param {(msg: string, err?: unknown) => void} [opciones.errorLogger]
 */
export function crearApp({
  dbPath = ':memory:',
  corsOrigins = false,
  clientDistPath,
  adminPin = null,
  rateLimitMax = 120,
  logger = console.log,
  errorLogger = console.error
} = {}) {
  const db = crearBaseDatos(dbPath);
  const incidenciaRepository = new IncidenciaRepository({ db });
  const incidenciaService = new IncidenciaService({ incidenciaRepository });
  const controladorIncidencias = crearControladorIncidencias({ incidenciaService });
  const routerIncidencias = crearRouterIncidencias({
    controladorIncidencias,
    limitarEscritura: crearRateLimiter({ maxPeticiones: rateLimitMax }),
    verificarPinAdmin: crearGuardiaPinAdmin(adminPin)
  });

  const app = express();
  app.disable('x-powered-by');
  app.locals.cerrarBaseDatos = () => {
    if (db.open) {
      db.close();
    }
  };
  app.locals.incidenciaService = incidenciaService;

  if (corsOrigins) {
    app.use(cors({ origin: corsOrigins, exposedHeaders: ['X-Total-Count'] }));
  }

  app.use(crearMiddlewareSeguridadYLogs(logger));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    try {
      incidenciaService.verificarSaludBaseDatos();
      res.status(200).json({
        success: true,
        data: { status: 'ok', service: 'labtrack-api', database: 'ok' }
      });
    } catch (error) {
      errorLogger('Fallo en chequeo de salud SQLite:', error);
      res.status(503).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
  });

  app.use('/api/incidencias', routerIncidencias);
  app.use('/api', responderRutaNoEncontrada);

  if (clientDistPath && existsSync(join(clientDistPath, 'index.html'))) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(join(clientDistPath, 'index.html'));
    });
  }

  app.use(responderRutaNoEncontrada);
  app.use(crearErrorHandler(errorLogger));

  return app;
}
