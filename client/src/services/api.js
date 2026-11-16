const BASE_API = '/api';

async function ejecutarPeticion(ruta, opciones = {}) {
  const { headers = {}, signal, ...resto } = opciones;
  const respuesta = await fetch(`${BASE_API}${ruta}`, {
    ...resto,
    signal,
    headers: {
      ...(resto.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    }
  });

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (HTTP ${respuesta.status})`);
  }

  if (!respuesta.ok || !cuerpo?.success) {
    const error = new Error(cuerpo?.error || `Error HTTP ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  return { data: cuerpo.data, headers: respuesta.headers };
}

function construirQuery(filtros = {}) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '' && valor !== false) {
      params.set(clave, String(valor));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function obtenerSalud({ signal } = {}) {
  const { data } = await ejecutarPeticion('/health', { signal });
  return data;
}

export async function listarIncidencias(filtros = {}, { signal } = {}) {
  const { data, headers } = await ejecutarPeticion(`/incidencias${construirQuery(filtros)}`, {
    signal
  });
  const totalHeader = headers?.get?.('X-Total-Count');
  const total = totalHeader ? Number.parseInt(totalHeader, 10) : data.length;
  return { items: data, total: Number.isNaN(total) ? data.length : total };
}

export async function obtenerIncidencia(id) {
  const { data } = await ejecutarPeticion(`/incidencias/${encodeURIComponent(id)}`);
  return data;
}

export async function crearIncidencia(payload) {
  const { data } = await ejecutarPeticion('/incidencias', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data;
}

export async function actualizarIncidencia(id, payload) {
  const { data } = await ejecutarPeticion(`/incidencias/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data;
}

export async function eliminarIncidencia(id, adminPin = '') {
  const headers = adminPin ? { 'x-admin-pin': adminPin } : {};
  const { data } = await ejecutarPeticion(`/incidencias/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers
  });
  return data;
}

export async function obtenerEstadisticas({ signal } = {}) {
  const { data } = await ejecutarPeticion('/incidencias/stats', { signal });
  return data;
}

export async function obtenerResumenPuestos({ signal } = {}) {
  const { data } = await ejecutarPeticion('/incidencias/puestos', { signal });
  return data;
}

export function construirUrlExportacionCsv(filtros = {}) {
  const filtrosExport = { ...filtros };
  delete filtrosExport.limit;
  delete filtrosExport.offset;
  return `${BASE_API}/incidencias/export${construirQuery(filtrosExport)}`;
}
