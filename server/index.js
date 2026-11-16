import { cargarEnvOpcional, obtenerConfiguracion } from './config.js';
import { crearApp } from './app.js';

cargarEnvOpcional();
const config = obtenerConfiguracion();

const app = crearApp({
  dbPath: config.dbPath,
  corsOrigins: config.corsOrigins,
  clientDistPath: config.clientDistPath,
  adminPin: config.adminPin
});

const server = app.listen(config.port, config.host, () => {
  console.log(`LabTrack API escuchando en http://${config.host}:${config.port}`);
});

server.headersTimeout = 10000;
server.requestTimeout = 30000;

server.on('error', (error) => {
  console.error(`Error al iniciar el servidor HTTP (${error.code ?? 'UNKNOWN'}):`, error.message);
  app.locals.cerrarBaseDatos();
  process.exit(1);
});

let cerrando = false;

function cerrarServidor(signal) {
  if (cerrando) {
    return;
  }
  cerrando = true;
  console.log(`Recibida señal ${signal}. Cerrando servidor...`);

  const temporizadorForzado = setTimeout(() => {
    app.locals.cerrarBaseDatos();
    process.exit(1);
  }, 5000);
  temporizadorForzado.unref();

  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  server.close(() => {
    clearTimeout(temporizadorForzado);
    app.locals.cerrarBaseDatos();
    process.exit(0);
  });
}

process.on('SIGINT', () => cerrarServidor('SIGINT'));
process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
