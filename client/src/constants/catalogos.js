export const COMPONENTES = Object.freeze([
  { value: 'MOTHERBOARD', label: 'Motherboard' },
  { value: 'CPU', label: 'CPU / Procesador' },
  { value: 'RAM', label: 'Memoria RAM' },
  { value: 'ALMACENAMIENTO', label: 'Almacenamiento (SSD/HDD)' },
  { value: 'FUENTE_PODER', label: 'Fuente de Poder' },
  { value: 'GPU', label: 'Placa de Video (GPU)' },
  { value: 'PERIFERICO', label: 'Periférico' },
  { value: 'RED', label: 'Red / Ethernet' },
  { value: 'OTRO', label: 'Otro' }
]);

export const PRIORIDADES = Object.freeze([
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' }
]);

export const ESTADOS = Object.freeze([
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_DIAGNOSTICO', label: 'En diagnóstico' },
  { value: 'ESPERANDO_REPUESTO', label: 'Esperando repuesto' },
  { value: 'RESUELTO', label: 'Resuelto' },
  { value: 'BAJA', label: 'Baja técnica' }
]);

export const ESTADOS_ACTIVOS = new Set(['PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO']);

export const ETIQUETA_COMPONENTE = Object.fromEntries(
  COMPONENTES.map((item) => [item.value, item.label])
);

export const ETIQUETA_PRIORIDAD = Object.fromEntries(
  PRIORIDADES.map((item) => [item.value, item.label])
);

export const ETIQUETA_ESTADO = Object.fromEntries(
  ESTADOS.map((item) => [item.value, item.label])
);

export function formatearFecha(isoString) {
  if (!isoString) {
    return '—';
  }
  const fecha = new Date(isoString);
  if (Number.isNaN(fecha.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(fecha);
}
