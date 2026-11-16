import { Router } from 'express';

/**
 * Envuelve handlers (síncronos o asíncronos) para derivar excepciones al middleware central.
 *
 * @param {(req: import('express').Request, res: import('express').Response) => unknown} fn
 */
function manejarAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Construye el router REST para `/api/incidencias`.
 *
 * @param {object} dependencias
 * @param {ReturnType<import('../controllers/incidencias.js').crearControladorIncidencias>} dependencias.controladorIncidencias
 * @param {import('express').RequestHandler} [dependencias.limitarEscritura]
 * @param {import('express').RequestHandler} [dependencias.verificarPinAdmin]
 * @returns {import('express').Router}
 */
export function crearRouterIncidencias({
  controladorIncidencias,
  limitarEscritura = (_req, _res, next) => next(),
  verificarPinAdmin = (_req, _res, next) => next()
}) {
  const router = Router();

  router.get('/stats', manejarAsync(controladorIncidencias.obtenerEstadisticas));
  router.get('/puestos', manejarAsync(controladorIncidencias.obtenerResumenPuestos));
  router.get('/export', limitarEscritura, manejarAsync(controladorIncidencias.exportarCsv));
  router.get('/', manejarAsync(controladorIncidencias.listar));
  router.get('/:id', manejarAsync(controladorIncidencias.obtenerPorId));
  router.post('/', limitarEscritura, manejarAsync(controladorIncidencias.registrar));
  router.patch('/:id', limitarEscritura, manejarAsync(controladorIncidencias.actualizar));
  router.delete(
    '/:id',
    limitarEscritura,
    verificarPinAdmin,
    manejarAsync(controladorIncidencias.eliminar)
  );

  return router;
}
