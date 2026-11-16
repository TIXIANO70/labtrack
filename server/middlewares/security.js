import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../models/incidencia.js';

/**
 * Limitador de tasa por IP en memoria para proteger endpoints mutantes y de exportación en LAN.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.ventanaMs]
 * @param {number} [opciones.maxPeticiones]
 */
export function crearRateLimiter({ ventanaMs = 60_000, maxPeticiones = 120 } = {}) {
  const registros = new Map();

  return function limitarTasa(req, res, next) {
    if (maxPeticiones <= 0) {
      return next();
    }

    const ahora = Date.now();
    if (registros.size > 1000) {
      for (const [ip, dato] of registros.entries()) {
        if (dato.expiraEn <= ahora) {
          registros.delete(ip);
        }
      }
    }

    const claveIp = req.ip || req.socket?.remoteAddress || 'desconocida';
    let entrada = registros.get(claveIp);
    if (!entrada || entrada.expiraEn <= ahora) {
      entrada = { conteo: 0, expiraEn: ahora + ventanaMs };
      registros.set(claveIp, entrada);
    }

    entrada.conteo += 1;
    if (entrada.conteo > maxPeticiones) {
      const segundosRestantes = Math.max(1, Math.ceil((entrada.expiraEn - ahora) / 1000));
      res.setHeader('Retry-After', String(segundosRestantes));
      return next(
        new AppError('Demasiadas peticiones en poco tiempo. Intentá nuevamente en unos segundos.', 429)
      );
    }

    return next();
  };
}

/**
 * Middleware opcional de protección con PIN para borrado cuando ADMIN_PIN está configurado en .env.
 *
 * @param {string | null} adminPin
 */
export function crearGuardiaPinAdmin(adminPin) {
  return function verificarPinAdmin(req, _res, next) {
    if (!adminPin) {
      return next();
    }

    const pinRecibido = req.get('x-admin-pin') ?? '';
    const bufEsperado = Buffer.from(adminPin, 'utf8');
    const bufRecibido = Buffer.from(pinRecibido, 'utf8');

    const coincide =
      bufEsperado.length === bufRecibido.length && timingSafeEqual(bufEsperado, bufRecibido);
    if (!coincide) {
      return next(new AppError('PIN administrativo inválido o requerido para esta acción', 403));
    }

    return next();
  };
}
