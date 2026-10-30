import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Boxes, ChevronDown, CircleAlert, Clock3,
  CreditCard, Download, Gauge, Layers3, Play, RefreshCw, Search, Server, ShoppingBag,
  SlidersHorizontal, Wifi, WifiOff, X
} from 'lucide-react'

const LatencyChart = lazy(() => import('./LatencyChart.jsx'))

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const serviceLabels = { inventory: 'Inventario', orders: 'Pedidos', payments: 'Pagos' }
const serviceIcons = { inventory: Boxes, orders: ShoppingBag, payments: CreditCard }
const formatter = new Intl.NumberFormat('es-CO')
const percent = value => `${Number(value || 0).toFixed(1)}%`
const time = value => `${Number(value || 0).toFixed(0)} ms`

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `La solicitud falló (${response.status})`)
  }
  return response.json()
}

function App() {
  const [summary, setSummary] = useState([])
  const [logs, setLogs] = useState([])
  const [chartLogs, setChartLogs] = useState([])
  const [filters, setFilters] = useState({ service: '', status: '', from: '', to: '' })
  const [page, setPage] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchDashboard = useCallback(async (signal) => {
    const query = new URLSearchParams({ page: String(page), size: '20' })
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value) })
    const chartQueries = Object.keys(serviceLabels).map(service => {
      const chartQuery = new URLSearchParams({ page: '0', size: '20', service })
      if (filters.from) chartQuery.set('from', filters.from)
      if (filters.to) chartQuery.set('to', filters.to)
      return chartQuery
    })
    try {
      const [nextSummary, nextLogs, ...nextChartPages] = await Promise.all([
        request('/api/metrics/summary', { signal }),
        request(`/api/metrics/logs?${query}`, { signal }),
        ...chartQueries.map(chartQuery => request(`/api/metrics/logs?${chartQuery}`, { signal })),
      ])
      setSummary(nextSummary)
      setLogs(nextLogs.content || [])
      setChartLogs(nextChartPages.flatMap(chartPage => chartPage.content || []))
      setTotalElements(nextLogs.totalElements || 0)
      setError('')
      setLastUpdated(new Date())
    } catch (failure) {
      if (failure.name !== 'AbortError') setError('No se pudo conectar con el backend. Se volverá a intentar automáticamente.')
    } finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => {
    const controller = new AbortController()
    fetchDashboard(controller.signal)
    const timer = window.setInterval(() => fetchDashboard(controller.signal), 3000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [fetchDashboard])

  const totals = useMemo(() => summary.reduce((acc, item) => ({
    calls: acc.calls + item.totalCalls,
    errors: acc.errors + item.totalCalls * item.errorRate / 100,
    duration: acc.duration + item.averageDurationMs * item.totalCalls,
  }), { calls: 0, errors: 0, duration: 0 }), [summary])
  const overallError = totals.calls ? totals.errors / totals.calls * 100 : 0
  const overallLatency = totals.calls ? totals.duration / totals.calls : 0
  const healthyServices = summary.filter(item => item.errorRate <= 15).length
  const chartSeries = Object.keys(serviceLabels).map(id => chartLogs
    .filter(log => log.serviceId === id)
    .slice(0, 20)
    .reverse())
  const chartData = Array.from({ length: Math.max(0, ...chartSeries.map(series => series.length)) }, (_, index) => ({
    call: String(index + 1).padStart(2, '0'),
    inventory: chartSeries[0][index]?.durationMs,
    orders: chartSeries[1][index]?.durationMs,
    payments: chartSeries[2][index]?.durationMs,
  }))

  async function simulateLoad() {
    setSimulating(true)
    try {
      const result = await request('/api/metrics/simulate-load', { method: 'POST' })
      setPage(0)
      await fetchDashboard()
      setError(`Carga simulada: ${result.generatedCalls} llamadas · ${result.errors} respuestas con error.`)
      window.setTimeout(() => setError(current => current.startsWith('Carga simulada:') ? '' : current), 5000)
    } catch (failure) { setError(failure.message || 'No fue posible simular la carga.') }
    finally { setSimulating(false) }
  }

  function updateFilter(key, value) { setPage(0); setFilters(current => ({ ...current, [key]: value })) }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="Pulse home"><span className="brand-mark"><Activity size={19} strokeWidth={2.7} /></span><span>pulse<span className="brand-dot">.</span></span></a>
      <div className="workspace"><span className="workspace-avatar">N</span><span><b>Northstar Labs</b><small>Workspace principal</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">OBSERVABILIDAD</div>
      <nav><a className="nav-item active" href="#overview"><Gauge size={17} />Resumen<span className="nav-active-dot" /></a><a className="nav-item" href="#logs"><Layers3 size={17} />Registro de actividad</a></nav>
      <div className="nav-label service-label">SERVICIOS</div>
      <nav className="service-nav">{Object.entries(serviceLabels).map(([id, label]) => {
        const Icon = serviceIcons[id]
        const current = summary.find(item => item.serviceId === id)
        return <a className="nav-item" href="#services" key={id}><Icon size={17} /><span>{label}</span><i className={current?.errorRate > 15 ? 'nav-status bad' : 'nav-status'} /></a>
      })}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Activity size={15} /></div><strong>Todo bajo control</strong><p>Revisa el pulso de tus servicios en un solo lugar.</p><a href="#logs">Ver actividad <ArrowUpRight size={13} /></a></div><div className="profile"><div className="profile-avatar">SC</div><span><b>Samuel Castro</b><small>Administrador</small></span><ChevronDown size={15} /></div></div>
    </aside>

    <main id="top" className="main-content">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>Resumen</b></div><div className="topbar-right"><span className="live-indicator"><i /> Sistema en vivo</span><span className="topbar-divider" /><button className="icon-button" aria-label="Descargar datos"><Download size={17} /></button><div className="top-avatar">SC</div></div></header>
      <div className="page-wrap">
        <section className="page-heading" id="overview"><div><div className="eyebrow"><span className="eyebrow-line" />CENTRO DE CONTROL</div><h1>Monitor de servicios</h1><p>Una vista clara de la salud y el rendimiento de tu plataforma.</p></div><div className="heading-actions"><span className="updated"><RefreshCw size={13} /> Actualizado {lastUpdated ? lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span><button className="primary-button" onClick={simulateLoad} disabled={simulating}><Play size={14} fill="currentColor" />{simulating ? 'Simulando…' : 'Simular carga'}</button></div></section>

        {error && <div className={`notice ${error.startsWith('Carga simulada:') ? 'notice-success' : ''}`}><CircleAlert size={16} /><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={15} /></button></div>}

        <section className="metric-grid" aria-label="Métricas generales">
          <div className="metric-card"><div className="metric-top"><span>Total de llamadas</span><span className="metric-icon blue"><Activity size={16} /></span></div><div className="metric-number">{formatter.format(totals.calls)}</div><div className="metric-foot">Desde el inicio del monitoreo</div><div className="spark spark-blue"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div>
          <div className="metric-card"><div className="metric-top"><span>Tiempo de respuesta</span><span className="metric-icon violet"><Clock3 size={16} /></span></div><div className="metric-number">{time(overallLatency)}</div><div className="metric-foot">Promedio de todos los servicios</div><div className="spark spark-violet"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div>
          <div className="metric-card"><div className="metric-top"><span>Tasa de error</span><span className="metric-icon coral"><CircleAlert size={16} /></span></div><div className="metric-number">{percent(overallError)}</div><div className="metric-foot">Solicitudes con estado de error</div><div className="spark spark-coral"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div>
          <div className="metric-card"><div className="metric-top"><span>Servicios saludables</span><span className="metric-icon green"><Server size={16} /></span></div><div className="metric-number">{healthyServices}<small> / 3</small></div><div className="metric-foot"><span className="health-dot" />{healthyServices === 3 ? 'Todos los sistemas operativos' : 'Algunos servicios requieren atención'}</div><div className="health-bars">{Object.keys(serviceLabels).map(id => <i key={id} className={summary.find(item => item.serviceId === id)?.errorRate > 15 ? 'bar-bad' : ''} />)}</div></div>
        </section>

        <section className="service-section" id="services"><div className="section-heading"><div><h2>Salud de servicios</h2><p>Rendimiento individual en tiempo real</p></div><button className="subtle-button" onClick={() => fetchDashboard()}><RefreshCw size={14} /> Actualizar</button></div><div className="service-grid">{Object.entries(serviceLabels).map(([id, label]) => {
          const item = summary.find(row => row.serviceId === id) || { totalCalls: 0, successRate: 100, averageDurationMs: 0, errorRate: 0 }
          const Icon = serviceIcons[id]
          const isBad = item.errorRate > 15
          return <article className={`service-card ${isBad ? 'service-card-bad' : ''}`} key={id}><div className="service-card-head"><div className={`service-icon ${id}`}><Icon size={18} /></div><div className="service-name"><h3>{label}</h3><span><i className={isBad ? 'status-dot bad' : 'status-dot'} />{isBad ? 'Degradado' : 'Operativo'}</span></div><button className="more-button" aria-label={`Más sobre ${label}`}>···</button></div><div className="service-stats"><div><small>Llamadas</small><b>{formatter.format(item.totalCalls)}</b></div><div><small>Éxito</small><b className={isBad ? 'text-bad' : ''}>{percent(item.successRate)}</b></div><div><small>Promedio</small><b>{time(item.averageDurationMs)}</b></div></div><div className="service-card-bottom"><span><span className="service-line" />En el período actual</span><span className={isBad ? 'text-bad' : 'muted'}>{percent(item.errorRate)} error</span></div></article>
        })}</div></section>

        <section className="chart-panel"><div className="panel-heading"><div><h2>Latencia por llamada</h2><p>Tiempo de respuesta de las últimas 20 solicitudes por servicio</p></div><div className="legend"><span><i className="legend-blue" />Inventario</span><span><i className="legend-violet" />Pedidos</span><span><i className="legend-amber" />Pagos</span></div></div><div className="chart-wrap"><Suspense fallback={<div className="chart-empty">Cargando gráfica…</div>}><LatencyChart data={chartData} />{chartData.length === 0 && <div className="chart-empty">Las llamadas aparecerán aquí cuando el dashboard reciba actividad.</div>}</Suspense></div></section>

        <section className="logs-panel" id="logs"><div className="panel-heading logs-heading"><div><h2>Registro de actividad</h2><p>Solicitudes recientes capturadas por el proxy de auditoría</p></div><div className="logs-heading-right"><span className="live-pill"><i /> EN VIVO</span><button className="filter-button" onClick={() => document.getElementById('filter-service')?.focus()}><SlidersHorizontal size={14} /> Filtros</button></div></div>
          <div className="filters-row"><label className="search-box"><Search size={15} /><span className="sr-only">Buscar request ID</span><input placeholder="Buscar por request ID…" onChange={event => { const value = event.target.value.trim(); updateFilter('requestId', value) }} /></label><label className="select-wrap"><span className="sr-only">Servicio</span><select id="filter-service" value={filters.service} onChange={event => updateFilter('service', event.target.value)}><option value="">Todos los servicios</option>{Object.entries(serviceLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap"><span className="sr-only">Estado</span><select value={filters.status} onChange={event => updateFilter('status', event.target.value)}><option value="">Todos los estados</option><option value="SUCCESS">Éxito</option><option value="ERROR">Error</option></select><ChevronDown size={14} /></label><label className="date-filter"><span>Desde</span><input type="datetime-local" value={filters.from ? new Date(filters.from).toISOString().slice(0, 16) : ''} onChange={event => updateFilter('from', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label><label className="date-filter"><span>Hasta</span><input type="datetime-local" value={filters.to ? new Date(filters.to).toISOString().slice(0, 16) : ''} onChange={event => updateFilter('to', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label><button className="clear-filters" onClick={() => { setFilters({ service: '', status: '', from: '', to: '', requestId: '' }); setPage(0) }}>Limpiar</button></div>
          <div className="table-scroll"><table><thead><tr><th>REQUEST ID</th><th>SERVICIO</th><th>OPERACIÓN</th><th>HORA</th><th>DURACIÓN</th><th>ESTADO</th><th /></tr></thead><tbody>{loading && logs.length === 0 ? <tr><td className="empty-state" colSpan="7">Cargando actividad…</td></tr> : logs.length === 0 ? <tr><td className="empty-state" colSpan="7">Aún no hay registros que coincidan con estos filtros.</td></tr> : logs.map(log => <tr key={log.requestId} className="log-row" onClick={() => setSelected(log)} tabIndex="0" onKeyDown={event => event.key === 'Enter' && setSelected(log)}><td className="request-id">{log.requestId?.slice(0, 8)}<span>…</span></td><td><span className={`service-cell-icon ${log.serviceId}`}>{(() => { const Icon = serviceIcons[log.serviceId] || Server; return <Icon size={13} /> })()}</span>{serviceLabels[log.serviceId] || log.serviceId}</td><td className="operation">{log.operation}</td><td className="log-time">{new Date(log.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td><td className="duration">{time(log.durationMs)}</td><td><span className={`status-badge ${log.status === 'SUCCESS' ? 'success' : 'failed'}`}><i />{log.status === 'SUCCESS' ? 'Éxito' : 'Error'}</span></td><td><ChevronDown className="row-chevron" size={15} /></td></tr>)}</tbody></table></div>
          <div className="table-footer"><span>Mostrando <b>{logs.length ? page * 20 + 1 : 0}–{page * 20 + logs.length}</b> de <b>{formatter.format(totalElements)}</b> registros</span><div className="pagination"><button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button><span>{page + 1}</span><button disabled={(page + 1) * 20 >= totalElements} onClick={() => setPage(p => p + 1)}>Siguiente</button></div></div>
        </section>
        <footer className="footer"><span>Pulse Monitor <i>·</i> Sistema de observabilidad</span><span><span className="footer-dot" /> API {error && !error.startsWith('Carga simulada:') ? 'sin conexión' : 'conectada'} <i>·</i> Actualización cada 3 s</span></footer>
      </div>
    </main>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">DETALLE DE SOLICITUD</span><h2 id="detail-title">{selected.operation}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={18} /></button></div><div className="detail-meta"><div><small>Servicio</small><b>{serviceLabels[selected.serviceId]}</b></div><div><small>Estado</small><b className={selected.status === 'ERROR' ? 'text-bad' : 'text-good'}>{selected.status === 'SUCCESS' ? 'Éxito' : 'Error'}</b></div><div><small>Duración</small><b>{time(selected.durationMs)}</b></div><div><small>Hora</small><b>{new Date(selected.timestamp).toLocaleString('es-CO')}</b></div></div><div className="request-copy"><small>REQUEST ID</small><code>{selected.requestId}</code></div><div className="detail-block"><h3>Parámetros de entrada</h3><pre>{JSON.stringify(selected.params ?? [], null, 2)}</pre></div><div className="detail-block"><h3>{selected.status === 'ERROR' ? 'Detalle del error' : 'Respuesta'}</h3><pre>{JSON.stringify(selected.status === 'ERROR' ? { message: selected.errorMessage, stackTraceSummary: selected.stackTraceSummary } : selected.response, null, 2)}</pre></div></section></div>}
  </div>
}

export default App
