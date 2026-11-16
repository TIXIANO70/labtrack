import { crearEntidadIncidencia } from '../models/incidencia.js';

/**
 * Escapa comodines SQL LIKE para evitar coincidencias no deseadas al buscar texto libre.
 *
 * @param {string} valor
 * @returns {string}
 */
function escaparLike(valor) {
  return valor.replace(/[\\%_]/g, '\\$&');
}

/**
 * Construye dinámicamente cláusulas WHERE parametrizadas según los filtros activos.
 *
 * @param {object} filtros
 * @returns {{ whereSql: string, params: Array<string | number> }}
 */
function construirWhereFiltros(filtros = {}) {
  const condiciones = [];
  const params = [];

  if (filtros.puestoId) {
    condiciones.push("puestoId LIKE ? ESCAPE '\\'");
    params.push(`%${escaparLike(filtros.puestoId)}%`);
  }
  if (filtros.estado) {
    condiciones.push('estado = ?');
    params.push(filtros.estado);
  } else if (filtros.soloActivas) {
    condiciones.push("estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO')");
  }
  if (filtros.componente) {
    condiciones.push('componente = ?');
    params.push(filtros.componente);
  }
  if (filtros.prioridad) {
    condiciones.push('prioridad = ?');
    params.push(filtros.prioridad);
  }
  if (filtros.soloRepuestos) {
    condiciones.push('requiereRepuesto = 1');
  }
  if (filtros.q) {
    const patron = `%${escaparLike(filtros.q)}%`;
    condiciones.push(
      "(puestoId LIKE ? ESCAPE '\\' OR sintoma LIKE ? ESCAPE '\\' OR COALESCE(tecnicoAsignado, '') LIKE ? ESCAPE '\\' OR COALESCE(diagnosticoNotas, '') LIKE ? ESCAPE '\\')"
    );
    params.push(patron, patron, patron, patron);
  }

  const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return { whereSql, params };
}

/**
 * Repositorio SQLite de incidencias e historial técnico usando sentencias preparadas.
 */
export class IncidenciaRepository {
  #db;

  /**
   * @param {object} dependencias
   * @param {import('better-sqlite3').Database} dependencias.db
   */
  constructor({ db }) {
    this.#db = db;
  }

  ping() {
    this.#db.prepare('SELECT 1 AS ok').get();
  }

  crear(incidencia, eventoInicial) {
    const insertIncidencia = this.#db.prepare(`
      INSERT INTO incidencias (
        id, puestoId, componente, sintoma, prioridad, estado,
        tecnicoAsignado, diagnosticoNotas, requiereRepuesto,
        fechaCreacion, fechaResolucion
      ) VALUES (
        @id, @puestoId, @componente, @sintoma, @prioridad, @estado,
        @tecnicoAsignado, @diagnosticoNotas, @requiereRepuesto,
        @fechaCreacion, @fechaResolucion
      )
    `);
    const insertEvento = this.#db.prepare(`
      INSERT INTO historial_incidencias (
        incidenciaId, tipoEvento, estadoAnterior, estadoNuevo, nota, autor, fecha
      ) VALUES (
        @incidenciaId, @tipoEvento, @estadoAnterior, @estadoNuevo, @nota, @autor, @fecha
      )
    `);

    const ejecutar = this.#db.transaction(() => {
      insertIncidencia.run({
        ...incidencia,
        requiereRepuesto: incidencia.requiereRepuesto ? 1 : 0
      });
      insertEvento.run(eventoInicial);
    });

    ejecutar();
    return crearEntidadIncidencia(incidencia);
  }

  listar(filtros = {}) {
    const { whereSql, params } = construirWhereFiltros(filtros);
    const limit = filtros.limit ?? 100;
    const offset = filtros.offset ?? 0;

    const total = this.#db
      .prepare(`SELECT COUNT(*) AS total FROM incidencias ${whereSql}`)
      .get(...params).total;

    const sql = `
      SELECT id, puestoId, componente, sintoma, prioridad, estado,
             tecnicoAsignado, diagnosticoNotas, requiereRepuesto,
             fechaCreacion, fechaResolucion
      FROM incidencias
      ${whereSql}
      ORDER BY
        CASE prioridad
          WHEN 'CRITICA' THEN 0
          WHEN 'ALTA' THEN 1
          WHEN 'MEDIA' THEN 2
          ELSE 3
        END ASC,
        fechaCreacion DESC
      LIMIT ? OFFSET ?
    `;

    const filas = this.#db.prepare(sql).all(...params, limit, offset);
    return { items: filas.map(crearEntidadIncidencia), total };
  }

  obtenerPorId(id) {
    const fila = this.#db
      .prepare(
        `
        SELECT id, puestoId, componente, sintoma, prioridad, estado,
               tecnicoAsignado, diagnosticoNotas, requiereRepuesto,
               fechaCreacion, fechaResolucion
        FROM incidencias
        WHERE id = ?
      `
      )
      .get(id);

    if (!fila) {
      return null;
    }

    const historial = this.#db
      .prepare(
        `
        SELECT id, incidenciaId, tipoEvento, estadoAnterior, estadoNuevo, nota, autor, fecha
        FROM historial_incidencias
        WHERE incidenciaId = ?
        ORDER BY fecha ASC, id ASC
      `
      )
      .all(id);

    return {
      ...crearEntidadIncidencia(fila),
      historial
    };
  }

  actualizar(id, cambios, eventoHistorial) {
    const updateSql = `
      UPDATE incidencias
      SET prioridad = @prioridad,
          estado = @estado,
          tecnicoAsignado = @tecnicoAsignado,
          diagnosticoNotas = @diagnosticoNotas,
          requiereRepuesto = @requiereRepuesto,
          fechaResolucion = @fechaResolucion
      WHERE id = @id
    `;
    const insertEventoSql = `
      INSERT INTO historial_incidencias (
        incidenciaId, tipoEvento, estadoAnterior, estadoNuevo, nota, autor, fecha
      ) VALUES (
        @incidenciaId, @tipoEvento, @estadoAnterior, @estadoNuevo, @nota, @autor, @fecha
      )
    `;

    const ejecutar = this.#db.transaction(() => {
      const resultado = this.#db.prepare(updateSql).run({
        id,
        prioridad: cambios.prioridad,
        estado: cambios.estado,
        tecnicoAsignado: cambios.tecnicoAsignado,
        diagnosticoNotas: cambios.diagnosticoNotas,
        requiereRepuesto: cambios.requiereRepuesto ? 1 : 0,
        fechaResolucion: cambios.fechaResolucion
      });

      if (resultado.changes === 0) {
        return false;
      }

      if (eventoHistorial) {
        this.#db.prepare(insertEventoSql).run(eventoHistorial);
      }
      return true;
    });

    return ejecutar() ? this.obtenerPorId(id) : null;
  }

  eliminar(id) {
    const resultado = this.#db.prepare('DELETE FROM incidencias WHERE id = ?').run(id);
    return resultado.changes > 0;
  }

  obtenerEstadisticas() {
    return this.#db
      .prepare(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END), 0) AS pendientes,
          COALESCE(SUM(CASE WHEN estado = 'EN_DIAGNOSTICO' THEN 1 ELSE 0 END), 0) AS enDiagnostico,
          COALESCE(SUM(CASE WHEN estado = 'ESPERANDO_REPUESTO' THEN 1 ELSE 0 END), 0) AS esperandoRepuesto,
          COALESCE(SUM(CASE WHEN estado = 'RESUELTO' THEN 1 ELSE 0 END), 0) AS resueltas,
          COALESCE(SUM(CASE WHEN estado = 'BAJA' THEN 1 ELSE 0 END), 0) AS bajas,
          COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO') AND prioridad = 'CRITICA' THEN 1 ELSE 0 END), 0) AS criticasActivas,
          COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO') AND requiereRepuesto = 1 THEN 1 ELSE 0 END), 0) AS repuestosPendientes,
          COUNT(DISTINCT CASE WHEN estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO') THEN puestoId END) AS puestosAfectados
        FROM incidencias
      `
      )
      .get();
  }

  obtenerAgregadoPuestos() {
    return this.#db
      .prepare(
        `
        SELECT
          puestoId,
          COUNT(*) AS totalIncidencias,
          COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO') THEN 1 ELSE 0 END), 0) AS activas,
          COALESCE(SUM(CASE WHEN estado = 'BAJA' THEN 1 ELSE 0 END), 0) AS bajas,
          COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO') AND prioridad = 'CRITICA' THEN 1 ELSE 0 END), 0) AS criticasActivas,
          MAX(fechaCreacion) AS ultimaIncidencia
        FROM incidencias
        GROUP BY puestoId
        ORDER BY activas DESC, criticasActivas DESC, totalIncidencias DESC, puestoId ASC
      `
      )
      .all();
  }
}
