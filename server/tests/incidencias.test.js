import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearBaseDatos } from '../db.js';
import { IncidenciaRepository } from '../repositories/incidenciaRepository.js';
import { IncidenciaService } from '../services/incidencias.js';
import { escaparCeldaCsv } from '../utils/validacion.js';
import { AppError, NotFoundError, ValidationError } from '../models/incidencia.js';
import {
  cargarEnvOpcional,
  obtenerConfiguracion,
  parsearCorsOrigins,
  parsearLineaEnv,
  parsearPuerto
} from '../config.js';
import { crearErrorHandler } from '../middlewares/errorHandler.js';
import { crearApp } from '../app.js';
import { cargarDatosMuestra } from '../seed.js';

describe('Configuración y modelo de dominio', () => {
  it('valida puertos, orígenes CORS, líneas .env y configuración por defecto', async () => {
    assert.equal(parsearPuerto(undefined), 3000);
    assert.equal(parsearPuerto('8080'), 8080);
    assert.throws(() => parsearPuerto('abc'), /Puerto inválido/);
    assert.throws(() => parsearPuerto('70000'), /Puerto fuera de rango/);
    assert.throws(() => parsearPuerto('0'), /Puerto fuera de rango/);

    assert.equal(parsearCorsOrigins('*'), true);
    assert.deepEqual(parsearCorsOrigins('http://localhost:5173, http://192.168.1.50:5173'), [
      'http://localhost:5173',
      'http://192.168.1.50:5173'
    ]);

    assert.equal(parsearLineaEnv('# comentario'), null);
    assert.deepEqual(parsearLineaEnv('export PORT="4500"'), ['PORT', '4500']);
    assert.deepEqual(parsearLineaEnv("ADMIN_PIN='secreto123'"), ['ADMIN_PIN', 'secreto123']);

    const tempDir = await mkdtemp(join(tmpdir(), 'labtrack-env-'));
    const envPath = join(tempDir, '.env');
    await writeFile(envPath, 'LABTRACK_TEST_NEW=valor_archivo\nLABTRACK_TEST_PRESET=desde_archivo\n');
    process.env.LABTRACK_TEST_PRESET = 'desde_entorno';
    delete process.env.LABTRACK_TEST_NEW;

    try {
      cargarEnvOpcional(envPath);
      assert.equal(process.env.LABTRACK_TEST_NEW, 'valor_archivo');
      assert.equal(process.env.LABTRACK_TEST_PRESET, 'desde_entorno');
    } finally {
      delete process.env.LABTRACK_TEST_NEW;
      delete process.env.LABTRACK_TEST_PRESET;
      await rm(tempDir, { recursive: true, force: true });
    }

    const cfg = obtenerConfiguracion({
      PORT: '4100',
      HOST: '0.0.0.0',
      DB_PATH: ':memory:',
      ADMIN_PIN: ' 1234 '
    });
    assert.equal(cfg.port, 4100);
    assert.equal(cfg.host, '0.0.0.0');
    assert.equal(cfg.dbPath, ':memory:');
    assert.equal(cfg.adminPin, '1234');
  });

  it('normaliza statusCode inválido en AppError a 500 y protege errorLogger fallido', () => {
    assert.equal(new AppError('Fallo', 999).statusCode, 500);
    assert.equal(new AppError('Fallo', 'bad').statusCode, 500);
    assert.equal(new AppError('Fallo', 422).statusCode, 422);

    const handler = crearErrorHandler(() => {
      throw new Error('Logger roto');
    });

    let statusCapturado = 0;
    let bodyCapturado = null;
    const fakeRes = {
      headersSent: false,
      status(code) {
        statusCapturado = code;
        return this;
      },
      json(payload) {
        bodyCapturado = payload;
        return this;
      }
    };

    handler(new AppError('Detalle interno SQL', 500), {}, fakeRes, () => {});
    assert.equal(statusCapturado, 500);
    assert.deepEqual(bodyCapturado, {
      success: false,
      error: 'Error interno del servidor'
    });
  });

  it('escapa CSV RFC 4180 y neutraliza inyección de fórmulas', () => {
    assert.equal(escaparCeldaCsv('=CMD|calc'), "'=CMD|calc");
    assert.equal(escaparCeldaCsv('+1+1'), "'+1+1");
    assert.equal(escaparCeldaCsv('-2*3'), "'-2*3");
    assert.equal(escaparCeldaCsv('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(escaparCeldaCsv('RAM, "slot 2"'), '"RAM, ""slot 2"""');
    assert.equal(escaparCeldaCsv(null), '');
  });
});

describe('IncidenciaService - reglas de negocio, bitácora y seed', () => {
  let db;
  let service;

  beforeEach(() => {
    db = crearBaseDatos(':memory:');
    const repository = new IncidenciaRepository({ db });
    service = new IncidenciaService({ incidenciaRepository: repository });
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
  });

  it('crea una incidencia válida e impone id, estado PENDIENTE y fechaCreacion', () => {
    const creada = service.registrarIncidencia({
      id: 'id-falsificado',
      puestoId: '  lab1-pc04  ',
      componente: 'ram',
      sintoma: '  No da video y emite 3 pitidos largos  ',
      estado: 'RESUELTO',
      fechaResolucion: '2020-01-01T00:00:00.000Z'
    });

    assert.notEqual(creada.id, 'id-falsificado');
    assert.match(
      creada.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    assert.equal(creada.puestoId, 'LAB1-PC04');
    assert.equal(creada.componente, 'RAM');
    assert.equal(creada.sintoma, 'No da video y emite 3 pitidos largos');
    assert.equal(creada.prioridad, 'MEDIA');
    assert.equal(creada.estado, 'PENDIENTE');
    assert.equal(creada.tecnicoAsignado, null);
    assert.equal(creada.diagnosticoNotas, null);
    assert.equal(creada.requiereRepuesto, false);
    assert.equal(creada.fechaResolucion, null);
    assert.ok(!Number.isNaN(Date.parse(creada.fechaCreacion)));
  });

  it('rechaza payloads malformados, enums inválidos, caracteres de control y límites excedidos', () => {
    for (const payloadInvalido of [null, [], 'texto', 123]) {
      assert.throws(
        () => service.registrarIncidencia(payloadInvalido),
        (err) => err instanceof ValidationError && err.statusCode === 400
      );
    }

    assert.throws(
      () => service.registrarIncidencia({ componente: 'RAM', sintoma: 'Falla' }),
      ValidationError
    );
    assert.throws(
      () =>
        service.registrarIncidencia({
          puestoId: 'LAB1-PC01',
          componente: 'RAM',
          sintoma: 'Falla',
          prioridad: '   '
        }),
      ValidationError
    );
    assert.throws(
      () =>
        service.registrarIncidencia({
          puestoId: 'LAB1-PC01\nINYECTADO',
          componente: 'RAM',
          sintoma: 'Falla'
        }),
      ValidationError
    );
    assert.throws(
      () =>
        service.registrarIncidencia({
          puestoId: 'A'.repeat(41),
          componente: 'RAM',
          sintoma: 'Falla'
        }),
      ValidationError
    );
    assert.throws(
      () =>
        service.registrarIncidencia({
          puestoId: 'LAB1-PC01',
          componente: 'RAM',
          sintoma: 'X'.repeat(1001)
        }),
      ValidationError
    );
    assert.throws(
      () =>
        service.registrarIncidencia({
          puestoId: 'LAB1-PC01',
          componente: 'RAM',
          sintoma: 'Falla',
          requiereRepuesto: 'si'
        }),
      ValidationError
    );
  });

  it('gestiona transiciones, bitácora sin eventos vacíos, fechaResolucion y bloqueo BAJA->RESUELTO', () => {
    const ticket = service.registrarIncidencia({
      puestoId: 'LAB2-PC05',
      componente: 'FUENTE_PODER',
      sintoma: 'No enciende',
      prioridad: 'ALTA'
    });

    assert.throws(() => service.actualizarIncidencia(ticket.id, {}), ValidationError);

    // No-op update no debe contaminar el historial
    const sinCambios = service.actualizarIncidencia(ticket.id, { estado: 'PENDIENTE' });
    assert.equal(sinCambios.historial.length, 1);

    const diag = service.actualizarIncidencia(ticket.id, {
      estado: 'EN_DIAGNOSTICO',
      tecnicoAsignado: 'Tiziano',
      diagnosticoNotas: 'Sin tensión en pin PS_ON'
    });
    assert.equal(diag.fechaResolucion, null);

    // Cambio solo de técnico y limpieza de notas debe quedar registrado
    const limpieza = service.actualizarIncidencia(ticket.id, {
      tecnicoAsignado: 'Lucía',
      diagnosticoNotas: null
    });
    assert.equal(limpieza.diagnosticoNotas, null);
    assert.match(limpieza.historial.at(-1).nota, /Técnico: Lucía/);
    assert.match(limpieza.historial.at(-1).nota, /eliminadas/);

    const resuelto = service.actualizarIncidencia(ticket.id, { estado: 'RESUELTO' });
    assert.ok(resuelto.fechaResolucion !== null);

    const reabierto = service.actualizarIncidencia(ticket.id, { estado: 'EN_DIAGNOSTICO' });
    assert.equal(reabierto.fechaResolucion, null);

    const baja = service.actualizarIncidencia(ticket.id, { estado: 'BAJA' });
    assert.ok(baja.fechaResolucion !== null);

    assert.throws(
      () => service.actualizarIncidencia(ticket.id, { estado: 'RESUELTO' }),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  it('filtra comodines LIKE literalmente, exporta >200 filas con BOM y ejecuta seed idempotente', () => {
    for (let i = 1; i <= 205; i += 1) {
      service.registrarIncidencia({
        puestoId: i === 1 ? 'LAB_100%' : `LAB-PC-${String(i).padStart(3, '0')}`,
        componente: 'RAM',
        sintoma: i === 1 ? 'Uso al 100% CPU' : `Falla controlada #${i}`
      });
    }

    const literal = service.listarIncidencias({ q: '100%' });
    assert.equal(literal.length, 1);
    assert.equal(literal[0].puestoId, 'LAB_100%');

    const paginado = service.listarIncidenciasConTotal({ limit: '50', offset: '200' });
    assert.equal(paginado.total, 205);
    assert.equal(paginado.items.length, 5);

    const csv = service.exportarCsv();
    assert.ok(csv.startsWith('\uFEFF'));
    const lineas = csv.trim().split('\n');
    assert.equal(lineas.length, 206);

    const dbSeed = crearBaseDatos(':memory:');
    try {
      assert.equal(cargarDatosMuestra(dbSeed), 5);
      assert.equal(cargarDatosMuestra(dbSeed), 0);
    } finally {
      dbSeed.close();
    }
  });

  it('detecta puestos reincidentes y lanza NotFoundError ante ID inexistente', () => {
    for (let i = 1; i <= 3; i += 1) {
      service.registrarIncidencia({
        puestoId: 'LAB1-PC09',
        componente: 'FUENTE_PODER',
        sintoma: `Reincidencia eléctrica #${i}`,
        prioridad: i === 3 ? 'CRITICA' : 'ALTA',
        requiereRepuesto: i === 3
      });
    }

    const puestos = service.obtenerResumenPuestos();
    assert.equal(puestos[0].reincidente, true);
    assert.equal(puestos[0].estadoPuesto, 'CON_FALLA');

    assert.throws(() => service.obtenerIncidencia('no-existe'), NotFoundError);
    assert.throws(() => service.eliminarIncidencia('no-existe'), NotFoundError);
  });
});

describe('API HTTP REST + Seguridad + SPA + Persistencia SQLite end-to-end', () => {
  let tempDir;
  let dbPath;
  let clientDistDir;
  let app;
  let server;
  let baseUrl;

  async function iniciarServidor(extra = {}) {
    app = crearApp({
      dbPath,
      corsOrigins: '*',
      clientDistPath: clientDistDir,
      logger: () => {},
      errorLogger: () => {},
      ...extra
    });
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }

  async function detenerServidor() {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    if (app) {
      app.locals.cerrarBaseDatos();
      app = null;
    }
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'labtrack-e2e-'));
    dbPath = join(tempDir, 'labtrack.db');
    clientDistDir = join(tempDir, 'dist');
    await writeFile(join(tempDir, 'dummy.txt'), 'ok');
    await rm(join(tempDir, 'dummy.txt'));
    await iniciarServidor();
  });

  afterEach(async () => {
    await detenerServidor();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('responde /api/health con CSP/cabeceras y devuelve 503 si la BD se cierra', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);

    app.locals.cerrarBaseDatos();
    const resCaida = await fetch(`${baseUrl}/api/health`);
    assert.equal(resCaida.status, 503);
    assert.deepEqual(await resCaida.json(), {
      success: false,
      error: 'Base de datos no disponible'
    });
  });

  it('sirve fallback SPA si existe dist/index.html, manteniendo 404 JSON para /api/*', async () => {
    await detenerServidor();
    const fs = await import('node:fs/promises');
    await fs.mkdir(clientDistDir, { recursive: true });
    await fs.writeFile(join(clientDistDir, 'index.html'), '<!doctype html><html><body>LabTrack</body></html>');
    await iniciarServidor();

    const spaRes = await fetch(`${baseUrl}/tablero`);
    assert.equal(spaRes.status, 200);
    assert.match(await spaRes.text(), /LabTrack/);

    const api404 = await fetch(`${baseUrl}/api/no-existe`);
    assert.equal(api404.status, 404);
    assert.deepEqual(await api404.json(), { success: false, error: 'Ruta no encontrada' });
  });

  it('ejecuta flujo CRUD, soloActivas, X-Total-Count, CSV con BOM y persiste tras reinicio', async () => {
    const c1 = await (
      await fetch(`${baseUrl}/api/incidencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puestoId: 'LAB1-PC08',
          componente: 'RAM',
          sintoma: '=No da video',
          prioridad: 'CRITICA',
          requiereRepuesto: true
        })
      })
    ).json();

    await fetch(`${baseUrl}/api/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puestoId: 'LAB2-PC01',
        componente: 'CPU',
        sintoma: 'Alta temperatura',
        prioridad: 'CRITICA'
      })
    });

    await fetch(`${baseUrl}/api/incidencias/${c1.data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'RESUELTO' })
    });

    const activasCriticas = await fetch(`${baseUrl}/api/incidencias?soloActivas=true&prioridad=CRITICA`);
    assert.equal(activasCriticas.status, 200);
    assert.equal(activasCriticas.headers.get('x-total-count'), '1');
    const jsonActivas = await activasCriticas.json();
    assert.equal(jsonActivas.data[0].puestoId, 'LAB2-PC01');

    const csvRes = await fetch(`${baseUrl}/api/incidencias/export`);
    const csvBuf = Buffer.from(await csvRes.arrayBuffer());
    assert.deepEqual([...csvBuf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.ok(csvBuf.toString('utf8').includes("'=No da video"));

    await detenerServidor();
    await iniciarServidor();

    const postReinicio = await fetch(`${baseUrl}/api/incidencias/${c1.data.id}`);
    assert.equal(postReinicio.status, 200);
    assert.equal((await postReinicio.json()).data.estado, 'RESUELTO');
  });

  it('aplica rate limiting y guardia ADMIN_PIN en DELETE cuando está configurado', async () => {
    await detenerServidor();
    await iniciarServidor({ adminPin: 'clave-99', rateLimitMax: 2 });

    const r1 = await fetch(`${baseUrl}/api/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puestoId: 'LAB1-PC01', componente: 'RAM', sintoma: 'Sin POST' })
    });
    assert.equal(r1.status, 201);
    const id = (await r1.json()).data.id;

    // 2da petición mutante sin PIN -> 403
    const delSinPin = await fetch(`${baseUrl}/api/incidencias/${id}`, { method: 'DELETE' });
    assert.equal(delSinPin.status, 403);

    // 3ra petición supera max=2 -> 429
    const rLimit = await fetch(`${baseUrl}/api/incidencias/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': 'clave-99' }
    });
    assert.equal(rLimit.status, 429);
    assert.ok(rLimit.headers.get('retry-after'));
  });

  it('maneja JSON inválido, URI malformada, enums inválidos, payload >256kb y 404 normalizados', async () => {
    const jsonInvalido = await fetch(`${baseUrl}/api/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalido'
    });
    assert.equal(jsonInvalido.status, 400);

    const filtroInvalido = await fetch(`${baseUrl}/api/incidencias?estado=INVENTADO`);
    assert.equal(filtroInvalido.status, 400);

    const uriMala = await fetch(`${baseUrl}/api/incidencias/%E0%A4%A`);
    assert.equal(uriMala.status, 400);

    const noExiste = await fetch(`${baseUrl}/api/incidencias/id_que_no_existe`);
    assert.equal(noExiste.status, 404);
    assert.deepEqual(await noExiste.json(), {
      success: false,
      error: 'Incidencia no encontrada'
    });

    const grande = await fetch(`${baseUrl}/api/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puestoId: 'LAB1-PC01',
        componente: 'RAM',
        sintoma: 'A'.repeat(300 * 1024)
      })
    });
    assert.equal(grande.status, 413);
  });
});
