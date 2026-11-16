import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarEnvOpcional, obtenerConfiguracion } from './config.js';
import { crearBaseDatos } from './db.js';
import { IncidenciaRepository } from './repositories/incidenciaRepository.js';
import { IncidenciaService } from './services/incidencias.js';

export const INCIDENCIAS_MUESTRA = [
  {
    puestoId: 'LAB1-PC04',
    componente: 'RAM',
    sintoma: 'No da video al encender y emite tres pitidos largos durante el POST.',
    prioridad: 'CRITICA',
    tecnicoAsignado: 'Tiziano Espinoza',
    requiereRepuesto: false,
    estadoFinal: 'EN_DIAGNOSTICO',
    diagnosticoNotas: 'Se detectó sulfatación en pines del módulo DIMM B2; realizando MemTest86.'
  },
  {
    puestoId: 'LAB1-PC08',
    componente: 'FUENTE_PODER',
    sintoma: 'El equipo se apaga de forma repentina bajo carga de compilación.',
    prioridad: 'ALTA',
    tecnicoAsignado: 'Tiziano Espinoza',
    requiereRepuesto: true,
    estadoFinal: 'ESPERANDO_REPUESTO',
    diagnosticoNotas: 'Línea de +12V cae a 11.1V en tester de fuente. Se solicita reemplazo ATX 500W.'
  },
  {
    puestoId: 'LAB1-PC12',
    componente: 'PERIFERICO',
    sintoma: 'Teclado USB con teclas W y S intermitentes.',
    prioridad: 'BAJA',
    tecnicoAsignado: null,
    requiereRepuesto: true,
    estadoFinal: 'PENDIENTE',
    diagnosticoNotas: null
  },
  {
    puestoId: 'LAB2-PC03',
    componente: 'ALMACENAMIENTO',
    sintoma: 'El sistema operativo tarda más de 4 minutos en iniciar; alertas SMART.',
    prioridad: 'ALTA',
    tecnicoAsignado: 'Mariano López',
    requiereRepuesto: false,
    estadoFinal: 'RESUELTO',
    diagnosticoNotas: 'SSD reemplazado por unidad SATA 240 GB nueva y clonada imagen base.'
  },
  {
    puestoId: 'TALLER-SRV01',
    componente: 'RED',
    sintoma: 'Enlace Ethernet cae de 1000 Mbps a 10 Mbps de manera intermitente.',
    prioridad: 'MEDIA',
    tecnicoAsignado: 'Tiziano Espinoza',
    requiereRepuesto: false,
    estadoFinal: 'PENDIENTE',
    diagnosticoNotas: null
  }
];

/**
 * Carga incidencias de muestra si la base de datos aún está vacía (idempotente).
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {number} Cantidad de registros insertados.
 */
export function cargarDatosMuestra(db) {
  const existentes = db.prepare('SELECT COUNT(*) AS total FROM incidencias').get();
  if (existentes.total > 0) {
    return 0;
  }

  const repository = new IncidenciaRepository({ db });
  const service = new IncidenciaService({ incidenciaRepository: repository });

  for (const muestra of INCIDENCIAS_MUESTRA) {
    const creada = service.registrarIncidencia(muestra);
    if (muestra.estadoFinal !== 'PENDIENTE' || muestra.diagnosticoNotas) {
      service.actualizarIncidencia(creada.id, {
        estado: muestra.estadoFinal,
        diagnosticoNotas: muestra.diagnosticoNotas,
        tecnicoAsignado: muestra.tecnicoAsignado,
        requiereRepuesto: muestra.requiereRepuesto
      });
    }
  }

  return INCIDENCIAS_MUESTRA.length;
}

const ejecutadoDirectamente =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ejecutadoDirectamente) {
  cargarEnvOpcional();
  const config = obtenerConfiguracion();
  const db = crearBaseDatos(config.dbPath);

  try {
    const insertados = cargarDatosMuestra(db);
    if (insertados === 0) {
      console.log('La base de datos ya contiene registros. No se duplicaron datos.');
    } else {
      console.log(`Seed completado: ${insertados} incidencias cargadas en ${config.dbPath}.`);
    }
  } finally {
    db.close();
  }
}
