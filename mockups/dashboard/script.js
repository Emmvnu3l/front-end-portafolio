const AUTH_STORAGE_KEY = 'ds-auth-user'
const THEME_STORAGE_KEY = 'ds-theme'

function getInitialTheme() {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark =
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  return prefersDark ? 'dark' : 'light'
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  syncThemeButton()
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light'
  setTheme(current === 'dark' ? 'light' : 'dark')
}

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildIdentityFromEmail(email) {
  const local = String(email ?? '').split('@')[0] || 'usuario'
  const clean = local.replace(/[._-]+/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)

  const name = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return {
    name: name || 'Usuario',
    initials: initials || 'U',
  }
}

function normalizeLegacyUser(user) {
  if (!user || typeof user !== 'object') return user

  const hasLegacyName = user.name === 'Liam Gallagher' || user.initials === 'LG'
  if (!hasLegacyName || !user.email) return user

  const identity = buildIdentityFromEmail(user.email)
  const normalized = {
    ...user,
    name: identity.name,
    initials: identity.initials,
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

function logout() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  window.location.href = '../login/login.html'
}

function svgEl(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag)
}

function syncThemeButton() {
  const label = document.getElementById('theme-label')
  const icon = document.getElementById('theme-icon')
  if (!label || !icon) return

  const theme = document.documentElement.dataset.theme || 'light'
  label.textContent = theme === 'dark' ? 'Dark' : 'Light'

  if (theme === 'dark') {
    icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  } else {
    icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
  }
}

function renderDonut(svg, distribution) {
  const colors = ['#16a34a', '#22c55e', '#86efac', '#34d399']
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const total = distribution.reduce((acc, d) => acc + d.value, 0) || 1

  svg.replaceChildren()

  const bg = svgEl('circle')
  bg.setAttribute('cx', '80')
  bg.setAttribute('cy', '80')
  bg.setAttribute('r', String(radius))
  bg.setAttribute('stroke', 'rgba(15,23,42,0.08)')
  bg.setAttribute('stroke-width', '16')
  bg.setAttribute('fill', 'none')
  svg.appendChild(bg)

  let offset = 0
  distribution.forEach((d, idx) => {
    const pct = d.value / total
    const dash = pct * circumference

    const seg = svgEl('circle')
    seg.setAttribute('cx', '80')
    seg.setAttribute('cy', '80')
    seg.setAttribute('r', String(radius))
    seg.setAttribute('stroke', colors[idx % colors.length])
    seg.setAttribute('stroke-width', '16')
    seg.setAttribute('fill', 'none')
    seg.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`)
    seg.setAttribute('stroke-dashoffset', String(-offset))
    seg.setAttribute('stroke-linecap', 'butt')
    seg.setAttribute('transform', 'rotate(-90 80 80)')
    svg.appendChild(seg)

    offset += dash
  })

  const inner = svgEl('circle')
  inner.setAttribute('cx', '80')
  inner.setAttribute('cy', '80')
  inner.setAttribute('r', '32')
  inner.setAttribute('fill', 'var(--ds-surface)')
  svg.appendChild(inner)
}

function renderLineChart(svg, series, threshold) {
  const width = 560
  const height = 170
  const padding = 18

  svg.replaceChildren()

  const ys = series.map((p) => p.y)
  const minY = Math.min(...ys, threshold)
  const maxY = Math.max(...ys, threshold)
  const range = maxY - minY || 1
  const maxX = Math.max(...series.map((p) => p.x), 1)

  function sx(x) {
    return padding + (x / maxX) * (width - padding * 2)
  }

  function sy(y) {
    return padding + ((maxY - y) / range) * (height - padding * 2)
  }

  const rect = svgEl('rect')
  rect.setAttribute('x', '0')
  rect.setAttribute('y', '0')
  rect.setAttribute('width', String(width))
  rect.setAttribute('height', String(height))
  rect.setAttribute('fill', 'transparent')
  svg.appendChild(rect)

  const thresholdY = sy(threshold)
  const line = svgEl('line')
  line.setAttribute('x1', String(padding))
  line.setAttribute('y1', String(thresholdY))
  line.setAttribute('x2', String(width - padding))
  line.setAttribute('y2', String(thresholdY))
  line.setAttribute('stroke', 'var(--ds-danger)')
  line.setAttribute('stroke-width', '1.5')
  line.setAttribute('stroke-dasharray', '6 5')
  svg.appendChild(line)

  const poly = svgEl('polyline')
  poly.setAttribute(
    'points',
    series.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' '),
  )
  poly.setAttribute('fill', 'none')
  poly.setAttribute('stroke', 'var(--ds-primary)')
  poly.setAttribute('stroke-width', '2.5')
  poly.setAttribute('stroke-linejoin', 'round')
  poly.setAttribute('stroke-linecap', 'round')
  svg.appendChild(poly)

  series.forEach((p) => {
    const dot = svgEl('circle')
    dot.setAttribute('cx', String(sx(p.x)))
    dot.setAttribute('cy', String(sy(p.y)))
    dot.setAttribute('r', '3.5')
    dot.setAttribute('fill', 'var(--ds-primary)')
    dot.setAttribute('stroke', 'var(--ds-surface)')
    dot.setAttribute('stroke-width', '2')
    svg.appendChild(dot)
  })
}

function setText(id, value) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = value
}

function getNavEls() {
  return {
    mobileNav: document.getElementById('mobile-nav'),
    openBtn: document.getElementById('open-nav'),
    closeBtn: document.getElementById('close-nav'),
  }
}

function openMobileNav() {
  const { mobileNav } = getNavEls()
  if (!mobileNav) return
  mobileNav.classList.remove('d-none')
  document.body.style.overflow = 'hidden'
}

function closeMobileNav() {
  const { mobileNav } = getNavEls()
  if (!mobileNav) return
  mobileNav.classList.add('d-none')
  document.body.style.overflow = ''
}

function wireNav() {
  const { mobileNav, openBtn, closeBtn } = getNavEls()

  if (openBtn) openBtn.addEventListener('click', openMobileNav)
  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav)

  if (mobileNav) {
    mobileNav.addEventListener('mousedown', (e) => {
      if (e.target === e.currentTarget) closeMobileNav()
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav()
    })
  }
}

function wireAuthButtons() {
  const logoutBtn = document.getElementById('logout')
  const logoutMobileBtn = document.getElementById('logout-mobile')
  if (logoutBtn) logoutBtn.addEventListener('click', logout)
  if (logoutMobileBtn) logoutMobileBtn.addEventListener('click', logout)
}

function wireFilters() {
  const form = document.getElementById('filters-form')
  if (!form) return

  function getSelectedText(id) {
    const select = document.getElementById(id)
    if (!select || select.selectedIndex < 0) return '—'
    return select.options[select.selectedIndex]?.textContent?.trim() || '—'
  }

  function update() {
    const filterType = getSelectedText('filterType')
    const deviceId = getSelectedText('deviceId')
    const dataMode = getSelectedText('dataMode')
    const timePeriod = getSelectedText('timePeriod')
    setText(
      'filters-applied',
      `${filterType} · ${deviceId} · ${dataMode} · ${timePeriod}`,
    )

    initMockData()
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    update()
  })

  form.addEventListener('change', update)

  update()
}

const mockDocuments = [
  {
    folio: 'B-10231',
    type: 'boleta',
    client: 'comercial-norte',
    clientName: 'Comercial Norte SpA',
    date: '2026-01-06',
    status: 'pagada',
    total: 145000,
    paid: 145000,
  },
  {
    folio: 'F-58014',
    type: 'factura',
    client: 'comercial-norte',
    clientName: 'Comercial Norte SpA',
    date: '2026-01-18',
    status: 'pendiente',
    total: 630000,
    paid: 230000,
  },
  {
    folio: 'B-10308',
    type: 'boleta',
    client: 'logistica-sur',
    clientName: 'Logistica Sur Ltda',
    date: '2026-02-03',
    status: 'pagada',
    total: 189000,
    paid: 189000,
  },
  {
    folio: 'F-58102',
    type: 'factura',
    client: 'retail-centro',
    clientName: 'Retail Centro SA',
    date: '2026-02-24',
    status: 'vencida',
    total: 910000,
    paid: 0,
  },
  {
    folio: 'B-10366',
    type: 'boleta',
    client: 'retail-centro',
    clientName: 'Retail Centro SA',
    date: '2026-03-05',
    status: 'pagada',
    total: 98000,
    paid: 98000,
  },
  {
    folio: 'F-58217',
    type: 'factura',
    client: 'logistica-sur',
    clientName: 'Logistica Sur Ltda',
    date: '2026-03-12',
    status: 'pagada',
    total: 740000,
    paid: 740000,
  },
  {
    folio: 'B-99077',
    type: 'boleta',
    client: 'comercial-norte',
    clientName: 'Comercial Norte SpA',
    date: '2025-11-12',
    status: 'pagada',
    total: 132000,
    paid: 132000,
  },
  {
    folio: 'F-55291',
    type: 'factura',
    client: 'logistica-sur',
    clientName: 'Logistica Sur Ltda',
    date: '2025-10-28',
    status: 'pendiente',
    total: 525000,
    paid: 125000,
  },
  {
    folio: 'B-99144',
    type: 'boleta',
    client: 'retail-centro',
    clientName: 'Retail Centro SA',
    date: '2025-09-17',
    status: 'pagada',
    total: 111000,
    paid: 111000,
  },
  {
    folio: 'F-53318',
    type: 'factura',
    client: 'comercial-norte',
    clientName: 'Comercial Norte SpA',
    date: '2024-12-03',
    status: 'vencida',
    total: 470000,
    paid: 0,
  },
  {
    folio: 'F-51940',
    type: 'factura',
    client: 'retail-centro',
    clientName: 'Retail Centro SA',
    date: '2024-10-09',
    status: 'pagada',
    total: 390000,
    paid: 390000,
  },
  {
    folio: 'B-96201',
    type: 'boleta',
    client: 'logistica-sur',
    clientName: 'Logistica Sur Ltda',
    date: '2024-08-21',
    status: 'pendiente',
    total: 101000,
    paid: 56000,
  },
]

function getFiltersState() {
  return {
    type: document.getElementById('filterType')?.value || 'all',
    client: document.getElementById('deviceId')?.value || 'all',
    mode: document.getElementById('dataMode')?.value || 'monthly',
    status: document.getElementById('timePeriod')?.value || 'all',
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString('es-CL')
}

function formatTrend(current, previous) {
  if (!previous) return 'n/a'
  const deltaPct = ((current - previous) / previous) * 100
  const sign = deltaPct > 0 ? '+' : ''
  return `${sign}${deltaPct.toFixed(1)}%`
}

function filterDocuments(filters) {
  return mockDocuments.filter((doc) => {
    if (filters.type !== 'all' && doc.type !== filters.type) return false
    if (filters.client !== 'all' && doc.client !== filters.client) return false
    if (filters.status !== 'all' && doc.status !== filters.status) return false
    return true
  })
}

function renderDocumentsTable(documents) {
  const tbody = document.getElementById('documents-table-body')
  const count = document.getElementById('documents-count')
  if (!tbody) return

  tbody.replaceChildren()
  if (count) {
    count.textContent = `Mostrando ${documents.length} registro${documents.length === 1 ? '' : 's'}`
  }

  if (!documents.length) {
    const tr = document.createElement('tr')
    const td = document.createElement('td')
    td.colSpan = 6
    td.className = 'text-center text-muted py-4'
    td.textContent = 'No hay boletas ni facturas para los filtros seleccionados.'
    tr.appendChild(td)
    tbody.appendChild(tr)
    return
  }

  const statusClass = {
    pagada: 'text-bg-success',
    pendiente: 'text-bg-warning',
    vencida: 'text-bg-danger',
  }

  documents
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((doc) => {
      const tr = document.createElement('tr')

      tr.innerHTML = `
        <td class="fw-semibold">${doc.folio}</td>
        <td class="text-capitalize">${doc.type}</td>
        <td>${doc.clientName}</td>
        <td>${formatDate(doc.date)}</td>
        <td><span class="badge ${statusClass[doc.status] || 'text-bg-secondary'} text-capitalize">${doc.status}</span></td>
        <td class="text-end">${formatCurrency(doc.total)}</td>
      `

      tbody.appendChild(tr)
    })
}

function getPeriodSeries(documents, mode) {
  if (mode === 'quarterly') {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    const buckets = [0, 0, 0, 0]
    documents.forEach((doc) => {
      const quarter = Math.floor(new Date(`${doc.date}T00:00:00`).getMonth() / 3)
      buckets[quarter] += doc.total
    })
    return labels.map((_, idx) => ({ x: idx + 1, y: buckets[idx] }))
  }

  if (mode === 'yearly') {
    const byYear = new Map()
    documents.forEach((doc) => {
      const year = new Date(`${doc.date}T00:00:00`).getFullYear()
      byYear.set(year, (byYear.get(year) || 0) + doc.total)
    })

    const yearlySeries = [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, total], idx) => ({ x: idx + 1, y: total }))

    return yearlySeries.length ? yearlySeries : [{ x: 1, y: 0 }]
  }

  const buckets = Array.from({ length: 12 }, () => 0)
  documents.forEach((doc) => {
    const month = new Date(`${doc.date}T00:00:00`).getMonth()
    buckets[month] += doc.total
  })
  return buckets.map((value, idx) => ({ x: idx + 1, y: value }))
}

function initMockData() {
  const filters = getFiltersState()
  const filtered = filterDocuments(filters)
  const previousYear = mockDocuments.filter((doc) => {
    const currentDate = new Date(`${doc.date}T00:00:00`)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    return (
      currentDate.getFullYear() === oneYearAgo.getFullYear() &&
      (filters.type === 'all' || doc.type === filters.type) &&
      (filters.client === 'all' || doc.client === filters.client) &&
      (filters.status === 'all' || doc.status === filters.status)
    )
  })

  const totalDocuments = filtered.length
  const totalBilled = filtered.reduce((acc, doc) => acc + doc.total, 0)
  const totalPaid = filtered.reduce((acc, doc) => acc + doc.paid, 0)
  const totalPending = Math.max(totalBilled - totalPaid, 0)

  const prevDocuments = previousYear.length
  const prevBilled = previousYear.reduce((acc, doc) => acc + doc.total, 0)
  const prevPaid = previousYear.reduce((acc, doc) => acc + doc.paid, 0)
  const prevPending = Math.max(prevBilled - prevPaid, 0)

  setText('m1-value', String(totalDocuments))
  setText('m1-trend', formatTrend(totalDocuments, prevDocuments))
  setText('m2-value', formatCurrency(totalBilled))
  setText('m2-trend', formatTrend(totalBilled, prevBilled))
  setText('m3-value', formatCurrency(totalPaid))
  setText('m3-trend', formatTrend(totalPaid, prevPaid))
  setText('m4-value', formatCurrency(totalPending))
  setText('m4-trend', formatTrend(totalPending, prevPending))

  const distribution = [
    {
      label: 'Boletas pagadas',
      value: filtered.filter((d) => d.type === 'boleta' && d.status === 'pagada').length,
    },
    {
      label: 'Boletas pendientes',
      value: filtered.filter((d) => d.type === 'boleta' && d.status !== 'pagada').length,
    },
    {
      label: 'Facturas pagadas',
      value: filtered.filter((d) => d.type === 'factura' && d.status === 'pagada').length,
    },
    {
      label: 'Facturas pendientes/vencidas',
      value: filtered.filter((d) => d.type === 'factura' && d.status !== 'pagada').length,
    },
  ]

  setText('energy-total', String(totalDocuments))
  const legend = document.getElementById('energy-legend')
  if (legend) {
    const colors = ['#16a34a', '#22c55e', '#86efac', '#34d399']
    const legendTotal = distribution.reduce((acc, item) => acc + item.value, 0) || 1
    legend.replaceChildren()
    distribution.forEach((d, idx) => {
      const li = document.createElement('li')
      li.className = 'd-flex align-items-center gap-2 mb-2'

      const dot = document.createElement('span')
      dot.setAttribute('aria-hidden', 'true')
      dot.style.width = '10px'
      dot.style.height = '10px'
      dot.style.borderRadius = '999px'
      dot.style.background = colors[idx % colors.length]
      dot.style.display = 'inline-block'

      const label = document.createElement('span')
      label.className = 'small'
      label.textContent = d.label

      const value = document.createElement('span')
      value.className = 'ms-auto small text-muted'
  value.textContent = `${Math.round((d.value / legendTotal) * 100)}%`

      li.appendChild(dot)
      li.appendChild(label)
      li.appendChild(value)
      legend.appendChild(li)
    })
  }

  const donut = document.getElementById('energy-donut')
  if (donut) renderDonut(donut, distribution)

  const chartMode = document.getElementById('chart-mode')
  if (chartMode) {
    const modeLabel = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual',
    }
    chartMode.textContent = modeLabel[filters.mode] || 'Mensual'
  }

  const series = getPeriodSeries(filtered, filters.mode)
  const validPoints = series.filter((point) => point.y > 0)
  const totalSeries = series.reduce((acc, point) => acc + point.y, 0)
  const avgSeries = totalSeries / (series.length || 1)
  const peakSeries = validPoints.length
    ? Math.max(...validPoints.map((point) => point.y))
    : 0

  const monthlyGoal = 900000
  const collectionRate = totalBilled ? (totalPaid / totalBilled) * 100 : 0
  setText('avg-kw', formatCurrency(Math.round(avgSeries)))
  setText('peak-kw', formatCurrency(peakSeries))
  setText('efficiency', `${collectionRate.toFixed(1)}%`)
  setText('threshold', formatCurrency(monthlyGoal))

  const chart = document.getElementById('demand-chart')
  if (chart) renderLineChart(chart, series, monthlyGoal)

  renderDocumentsTable(filtered)
}

document.addEventListener('DOMContentLoaded', () => {
  setTheme(getInitialTheme())

  const user = normalizeLegacyUser(getStoredUser())
  if (!user) {
    window.location.href = '../login/login.html'
    return
  }

  setText('user-name', user.name || 'User')
  setText('user-avatar', user.initials || 'U')

  const toggleThemeBtn = document.getElementById('toggle-theme')
  if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme)

  wireNav()
  wireAuthButtons()
  wireFilters()
  initMockData()
})
