import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App.jsx';

function crearRespuestaJson(data, status = 200, extraHeaders = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(extraHeaders),
    json: async () => ({ success: true, data })
  };
}

function crearRespuestaError(error, status = 400) {
  return {
    ok: false,
    status,
    headers: new Headers(),
    json: async () => ({ success: false, error })
  };
}

describe('LabTrack Frontend SPA', () => {
  let ticketsDb;
  let fetchMock;
  let forzarErrorPatch;
  let pinRequerido;

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    forzarErrorPatch = false;
    pinRequerido = '';

    ticketsDb = [
      {
        id: 'tkt-1',
        puestoId: 'LAB1-PC04',
        componente: 'RAM',
        sintoma: 'No da video, tres pitidos',
        prioridad: 'CRITICA',
        estado: 'PENDIENTE',
        tecnicoAsignado: 'Tiziano',
        diagnosticoNotas: null,
        requiereRepuesto: true,
        fechaCreacion: '2026-11-15T12:00:00.000Z',
        fechaResolucion: null,
        historial: [
          {
            id: 1,
            incidenciaId: 'tkt-1',
            tipoEvento: 'CREACION',
            estadoAnterior: null,
            estadoNuevo: 'PENDIENTE',
            nota: 'Alta inicial',
            autor: 'Tiziano',
            fecha: '2026-11-15T12:00:00.000Z'
          }
        ]
      },
      {
        id: 'tkt-2',
        puestoId: 'LAB1-PC09',
        componente: 'CPU',
        sintoma: 'Equipo dado de baja por socket dañado',
        prioridad: 'CRITICA',
        estado: 'BAJA',
        tecnicoAsignado: 'Tiziano',
        diagnosticoNotas: 'Irrecuperable',
        requiereRepuesto: false,
        fechaCreacion: '2026-11-14T10:00:00.000Z',
        fechaResolucion: '2026-11-14T11:00:00.000Z',
        historial: []
      }
    ];

    fetchMock = vi.fn(async (url, opciones = {}) => {
      const metodo = opciones.method ?? 'GET';
      const parsed = new URL(url, 'http://localhost');
      const path = parsed.pathname;

      if (path === '/api/health') {
        return crearRespuestaJson({ status: 'ok', service: 'labtrack-api', database: 'ok' });
      }

      if (path === '/api/incidencias/stats') {
        return crearRespuestaJson({
          total: ticketsDb.length,
          pendientes: ticketsDb.filter((t) => t.estado === 'PENDIENTE').length,
          enDiagnostico: ticketsDb.filter((t) => t.estado === 'EN_DIAGNOSTICO').length,
          esperandoRepuesto: ticketsDb.filter((t) => t.estado === 'ESPERANDO_REPUESTO').length,
          resueltas: ticketsDb.filter((t) => t.estado === 'RESUELTO').length,
          bajas: ticketsDb.filter((t) => t.estado === 'BAJA').length,
          criticasActivas: ticketsDb.filter(
            (t) => t.prioridad === 'CRITICA' && t.estado !== 'RESUELTO' && t.estado !== 'BAJA'
          ).length,
          repuestosPendientes: ticketsDb.filter(
            (t) => t.requiereRepuesto && t.estado !== 'RESUELTO' && t.estado !== 'BAJA'
          ).length
        });
      }

      if (path === '/api/incidencias/puestos') {
        return crearRespuestaJson([
          {
            puestoId: 'LAB1-PC04',
            totalIncidencias: 3,
            activas: 1,
            bajas: 0,
            criticasActivas: 1,
            ultimaIncidencia: '2026-11-15T12:00:00.000Z',
            estadoPuesto: 'CON_FALLA',
            reincidente: true
          }
        ]);
      }

      if (path === '/api/incidencias' && metodo === 'GET') {
        const estado = parsed.searchParams.get('estado');
        const prioridad = parsed.searchParams.get('prioridad');
        const soloActivas = parsed.searchParams.get('soloActivas') === 'true';
        const q = (parsed.searchParams.get('q') ?? '').toLowerCase();

        if (q === 'error-400') {
          return crearRespuestaError('Parámetro de búsqueda inválido', 400);
        }

        const filtradas = ticketsDb.filter((t) => {
          if (estado && t.estado !== estado) return false;
          if (soloActivas && (t.estado === 'RESUELTO' || t.estado === 'BAJA')) return false;
          if (prioridad && t.prioridad !== prioridad) return false;
          if (q && !t.puestoId.toLowerCase().includes(q) && !t.sintoma.toLowerCase().includes(q)) {
            return false;
          }
          return true;
        });
        return crearRespuestaJson(filtradas, 200, { 'X-Total-Count': String(filtradas.length) });
      }

      if (path === '/api/incidencias' && metodo === 'POST') {
        const body = JSON.parse(opciones.body);
        const nuevo = {
          id: `tkt-${ticketsDb.length + 1}`,
          ...body,
          estado: 'PENDIENTE',
          diagnosticoNotas: null,
          fechaCreacion: '2026-11-15T13:00:00.000Z',
          fechaResolucion: null,
          historial: []
        };
        ticketsDb = [nuevo, ...ticketsDb];
        return crearRespuestaJson(nuevo, 201);
      }

      if (path.startsWith('/api/incidencias/') && metodo === 'GET') {
        const id = path.split('/').pop();
        const item = ticketsDb.find((t) => t.id === id);
        return item ? crearRespuestaJson(item) : crearRespuestaError('Incidencia no encontrada', 404);
      }

      if (path.startsWith('/api/incidencias/') && metodo === 'PATCH') {
        if (forzarErrorPatch) {
          return crearRespuestaError('Error simulado en actualización', 400);
        }
        const id = path.split('/').pop();
        const cambios = JSON.parse(opciones.body);
        ticketsDb = ticketsDb.map((t) =>
          t.id === id
            ? {
                ...t,
                ...cambios,
                fechaResolucion: cambios.estado === 'RESUELTO' ? '2026-11-15T14:00:00.000Z' : null
              }
            : t
        );
        return crearRespuestaJson(ticketsDb.find((t) => t.id === id));
      }

      if (path.startsWith('/api/incidencias/') && metodo === 'DELETE') {
        const pinEnviado = opciones.headers?.['x-admin-pin'] ?? '';
        if (pinRequerido && pinEnviado !== pinRequerido) {
          return crearRespuestaError('PIN administrativo inválido o requerido', 403);
        }
        const id = path.split('/').pop();
        ticketsDb = ticketsDb.filter((t) => t.id !== id);
        return crearRespuestaJson({ id, eliminado: true });
      }

      return crearRespuestaError('Ruta no encontrada', 404);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('precarga ?puesto= desde la URL y carga métricas y listado inicial', async () => {
    window.history.replaceState({}, '', '/?puesto=lab3-pc02');
    render(<App />);

    expect(await screen.findByText('API + SQLite OK')).toBeInTheDocument();
    const inputPuesto = within(
      screen.getByRole('complementary', { name: 'Registrar nueva incidencia' })
    ).getByLabelText('Puesto / Equipo *');
    expect(inputPuesto).toHaveValue('LAB3-PC02');
  });

  it('detecta duplicados incluso bajo filtros activos y crea un ticket sin recargar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('No da video, tres pitidos');

    await user.selectOptions(screen.getByLabelText('Estado'), 'RESUELTO');
    expect(
      await screen.findByText('No hay incidencias que coincidan con los filtros actuales.')
    ).toBeInTheDocument();

    const formulario = screen.getByRole('complementary', { name: 'Registrar nueva incidencia' });
    await user.type(within(formulario).getByLabelText('Puesto / Equipo *'), 'LAB1-PC04');
    expect(await screen.findByText(/Ya existe una incidencia activa/i)).toBeInTheDocument();

    await user.clear(within(formulario).getByLabelText('Puesto / Equipo *'));
    await user.type(within(formulario).getByLabelText('Puesto / Equipo *'), 'LAB2-PC10');
    await user.selectOptions(within(formulario).getByLabelText('Componente afectado *'), 'GPU');
    await user.selectOptions(within(formulario).getByLabelText('Prioridad'), 'ALTA');
    await user.type(within(formulario).getByLabelText('Síntoma técnico observado *'), 'Sin señal HDMI');
    await user.click(within(formulario).getByRole('button', { name: 'Registrar ticket' }));

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(await screen.findByText('Sin señal HDMI')).toBeInTheDocument();
  });

  it('filtra Críticas activas desde StatCards excluyendo BAJA y mantiene verde API ante error 400', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('No da video, tres pitidos');

    const cardCriticas = screen.getByRole('button', { name: /Críticas activas/i });
    await user.click(cardCriticas);
    expect(cardCriticas).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No da video, tres pitidos')).toBeInTheDocument();
    expect(screen.queryByText('Equipo dado de baja por socket dañado')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar puesto, síntoma o técnico'), 'error-400');
    expect(await screen.findByText('Parámetro de búsqueda inválido')).toBeInTheDocument();
    expect(screen.getByText('API + SQLite OK')).toBeInTheDocument();
  });

  it('cierra modal con Escape, bloquea BAJA->RESUELTO, maneja error y PIN en DELETE', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Ticket en BAJA tiene deshabilitada la opción RESUELTO
    await user.click(await screen.findByText('Equipo dado de baja por socket dañado'));
    const modalBaja = await screen.findByRole('dialog');
    const opcionResuelto = within(within(modalBaja).getByLabelText('Estado operativo')).getByRole(
      'option',
      { name: 'Resuelto' }
    );
    expect(opcionResuelto).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Error en PATCH mantiene modal abierta y luego PIN en DELETE
    await user.click(await screen.findByText('No da video, tres pitidos'));
    forzarErrorPatch = true;
    await user.click(screen.getByRole('button', { name: 'Guardar diagnóstico' }));
    expect(await screen.findByText('Error simulado en actualización')).toBeInTheDocument();

    pinRequerido = '9988';
    await user.click(screen.getByRole('button', { name: 'Eliminar registro' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByLabelText('PIN administrativo de laboratorio')).toBeInTheDocument();

    await user.type(screen.getByLabelText('PIN administrativo de laboratorio'), '9988');
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText('Incidencia eliminada correctamente.')).toBeInTheDocument();
  });
});
