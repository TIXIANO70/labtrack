import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS incidencias (
  id TEXT PRIMARY KEY,
  puestoId TEXT NOT NULL,
  componente TEXT NOT NULL CHECK (componente IN (
    'MOTHERBOARD', 'CPU', 'RAM', 'ALMACENAMIENTO',
    'FUENTE_PODER', 'GPU', 'PERIFERICO', 'RED', 'OTRO'
  )),
  sintoma TEXT NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN (
    'BAJA', 'MEDIA', 'ALTA', 'CRITICA'
  )),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN (
    'PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO', 'RESUELTO', 'BAJA'
  )),
  tecnicoAsignado TEXT,
  diagnosticoNotas TEXT,
  requiereRepuesto INTEGER NOT NULL DEFAULT 0 CHECK (requiereRepuesto IN (0, 1)),
  fechaCreacion TEXT NOT NULL,
  fechaResolucion TEXT
);

CREATE TABLE IF NOT EXISTS historial_incidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incidenciaId TEXT NOT NULL,
  tipoEvento TEXT NOT NULL CHECK (tipoEvento IN (
    'CREACION', 'CAMBIO_ESTADO', 'DIAGNOSTICO', 'ACTUALIZACION'
  )),
  estadoAnterior TEXT,
  estadoNuevo TEXT NOT NULL,
  nota TEXT,
  autor TEXT,
  fecha TEXT NOT NULL,
  FOREIGN KEY (incidenciaId) REFERENCES incidencias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias (estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_componente ON incidencias (componente);
CREATE INDEX IF NOT EXISTS idx_incidencias_puesto ON incidencias (puestoId);
CREATE INDEX IF NOT EXISTS idx_incidencias_prioridad_fecha ON incidencias (prioridad, fechaCreacion DESC);
CREATE INDEX IF NOT EXISTS idx_historial_incidencia_fecha ON historial_incidencias (incidenciaId, fecha ASC, id ASC);
`;

/**
 * Inicializa la conexión SQLite local, aplica pragmas ACID y garantiza el esquema DDL.
 *
 * @param {string} dbPath
 * @returns {import('better-sqlite3').Database}
 */
export function crearBaseDatos(dbPath) {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(SCHEMA_SQL);
  return db;
}
