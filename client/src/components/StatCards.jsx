export function StatCards({
  estadisticas,
  filtroEstadoActivo,
  filtroPrioridadActivo,
  soloRepuestos,
  soloActivas,
  onSeleccionarEstado,
  onAlternarRepuestos
}) {
  const criticasActivo = Boolean(soloActivas && filtroPrioridadActivo === 'CRITICA');
  const tarjetas = [
    {
      id: 'total',
      label: 'Total tickets',
      valor: estadisticas.total ?? 0,
      activa: !filtroEstadoActivo && !soloRepuestos && !criticasActivo,
      onClick: () => onSeleccionarEstado('')
    },
    {
      id: 'pendientes',
      label: 'Pendientes',
      valor: estadisticas.pendientes ?? 0,
      activa: filtroEstadoActivo === 'PENDIENTE',
      onClick: () => onSeleccionarEstado(filtroEstadoActivo === 'PENDIENTE' ? '' : 'PENDIENTE')
    },
    {
      id: 'enDiagnostico',
      label: 'En diagnóstico',
      valor: estadisticas.enDiagnostico ?? 0,
      activa: filtroEstadoActivo === 'EN_DIAGNOSTICO',
      onClick: () =>
        onSeleccionarEstado(filtroEstadoActivo === 'EN_DIAGNOSTICO' ? '' : 'EN_DIAGNOSTICO')
    },
    {
      id: 'esperandoRepuesto',
      label: 'Esperando repuesto',
      valor: estadisticas.esperandoRepuesto ?? 0,
      activa: filtroEstadoActivo === 'ESPERANDO_REPUESTO',
      onClick: () =>
        onSeleccionarEstado(
          filtroEstadoActivo === 'ESPERANDO_REPUESTO' ? '' : 'ESPERANDO_REPUESTO'
        )
    },
    {
      id: 'resueltas',
      label: 'Resueltas',
      valor: estadisticas.resueltas ?? 0,
      activa: filtroEstadoActivo === 'RESUELTO',
      onClick: () => onSeleccionarEstado(filtroEstadoActivo === 'RESUELTO' ? '' : 'RESUELTO')
    },
    {
      id: 'repuestosPendientes',
      label: 'Cola de repuestos',
      valor: estadisticas.repuestosPendientes ?? 0,
      activa: Boolean(soloRepuestos),
      onClick: () => onAlternarRepuestos()
    },
    {
      id: 'criticasActivas',
      label: 'Críticas activas',
      valor: estadisticas.criticasActivas ?? 0,
      activa: criticasActivo,
      onClick: () =>
        onSeleccionarEstado(
          '',
          criticasActivo ? { soloActivas: false, prioridad: '' } : { soloActivas: true, prioridad: 'CRITICA' }
        )
    }
  ];

  return (
    <section className="stat-grid" aria-label="Métricas de salud del laboratorio">
      {tarjetas.map((tarjeta) => (
        <button
          key={tarjeta.id}
          type="button"
          className={`stat-card${tarjeta.activa ? ' active' : ''}`}
          aria-pressed={tarjeta.activa}
          onClick={tarjeta.onClick}
        >
          <span className="stat-label">{tarjeta.label}</span>
          <span className="stat-value">{tarjeta.valor}</span>
        </button>
      ))}
    </section>
  );
}
