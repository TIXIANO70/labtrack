import { AppError } from '../models/incidencia.js';

/**
 * Registra un error usando el logger provisto sin permitir que un fallo de log rompa la respuesta HTTP.
 *
 * @param {(msg: string, err?: unknown) => void} errorLogger
 * @param {string} mensaje
 * @param {unknown} error
 */
function registrarErrorSeguro(errorLogger, mensaje, error) {
  try {
    errorLogger(mensaje, error);
  } catch {
    // Evitamos que un logger defectuoso impida enviar la respuesta JSON.
  }
}

/**
 * Envía respuesta 404 normalizada para rutas de API inexistentes.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function responderRutaNoEncontrada(_req, res) {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
}

/**
 * Crea el middleware centralizado de manejo de excepciones para Express.
 *
 * @param {(msg: string, err?: unknown) => void} [errorLogger]
 * @returns {import('express').ErrorRequestHandler}
 */
export function crearErrorHandler(errorLogger = console.error) {
  return function manejarError(error, _req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: 'El cuerpo de la petición no es un JSON válido'
      });
    }

    if (error?.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: 'El cuerpo de la petición excede el tamaño máximo permitido'
      });
    }

    if (error instanceof URIError) {
      return res.status(400).json({
        success: false,
        error: 'La URL solicitada contiene una codificación inválida'
      });
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        registrarErrorSeguro(errorLogger, 'Error operacional del servidor:', error);
        return res.status(error.statusCode).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    registrarErrorSeguro(errorLogger, 'Error inesperado en servidor:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  };
}
