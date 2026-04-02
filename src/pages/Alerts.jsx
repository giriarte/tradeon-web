import { useState, useEffect } from 'react'
import { BASE_URL, USER_ID } from '../config'
import './Alerts.css'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d) ? value : d.toLocaleString()
}

const COLUMNS = [
  { key: 'alertTime', label: 'Date' },
  { key: 'strategyName', label: 'Strategy' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'signalType', label: 'Signal Type' },
]

function getSortValue(item, key) {
  const v = item[key]
  if (key === 'alertTime') return v ? new Date(v).getTime() : 0
  return v ?? ''
}

function Alerts() {
  const [items, setItems] = useState([])
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // tokenStack[i] is the nextToken needed to load page i (null = first page)
  const [tokenStack, setTokenStack] = useState([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [nextToken, setNextToken] = useState(null)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')

  useEffect(() => {
    fetch(`${BASE_URL}/strategies/user/${USER_ID}`)
      .then(r => r.json())
      .then(data => setStrategies(data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadPage(tokenStack[pageIndex])
  }, [pageIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPage = (token) => {
    setLoading(true)
    setError(null)
    const url = `${BASE_URL}/alerts/user/${USER_ID}?limit=${PAGE_SIZE}${token ? `&nextToken=${encodeURIComponent(token)}` : ''}`
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`Failed to load alerts (${r.status})`); return r.json() })
      .then(data => {
        setItems(data.items ?? [])
        setNextToken(data.nextToken ?? null)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  const handleNext = () => {
    const newIndex = pageIndex + 1
    setTokenStack(prev => {
      const updated = [...prev]
      updated[newIndex] = nextToken
      return updated
    })
    setPageIndex(newIndex)
  }

  const handlePrev = () => {
    setPageIndex(prev => prev - 1)
  }

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(key)
      setSortDir('asc')
    }
  }

  const handleResetFilters = () => {
    setDateFrom('')
    setDateTo('')
    setStrategyFilter('')
  }

  const hasFilters = dateFrom || dateTo || strategyFilter

  const filteredItems = items.filter(item => {
    if (strategyFilter && item.strategyName !== strategyFilter) return false
    if (dateFrom || dateTo) {
      const t = item.alertTime ? new Date(item.alertTime).getTime() : null
      if (!t) return false
      if (dateFrom && t < new Date(dateFrom).getTime()) return false
      if (dateTo && t > new Date(dateTo + 'T23:59:59').getTime()) return false
    }
    return true
  })

  const sortedItems = sortCol
    ? [...filteredItems].sort((a, b) => {
        const av = getSortValue(a, sortCol)
        const bv = getSortValue(b, sortCol)
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    : filteredItems

  return (
    <div className="alerts-page">
      <h1>Alerts</h1>

      <div className="alerts-filters">
        <div className="filter-group">
          <label>Date From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Date To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Strategy</label>
          <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)}>
            <option value="">— All —</option>
            {strategies.map(s => (
              <option key={s.strategyId} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button className="btn-reset-filters" onClick={handleResetFilters}>Reset</button>
        )}
      </div>

      {error && <div className="alerts-error">{error}</div>}

      <div className="alerts-table-wrapper">
        <table className="alerts-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className="sortable-th" onClick={() => handleSort(col.key)}>
                  {col.label}
                  <span className="sort-indicator">
                    {sortCol === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="alerts-status">Loading...</td></tr>
            )}
            {!loading && sortedItems.length === 0 && (
              <tr><td colSpan={4} className="alerts-status">No alerts found.</td></tr>
            )}
            {!loading && sortedItems.map(item => (
              <tr key={item.alertId}>
                <td>{formatDate(item.alertTime)}</td>
                <td>{item.strategyName ?? '—'}</td>
                <td>{item.symbol ?? '—'}</td>
                <td>{item.signalType == 1 ? 'Buy' : item.signalType == 2 ? 'Sell' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alerts-pagination">
        <button
          className="pagination-btn"
          onClick={handlePrev}
          disabled={pageIndex === 0 || loading}
        >
          ← Prev
        </button>
        <span className="pagination-page">Page {pageIndex + 1}</span>
        <button
          className="pagination-btn"
          onClick={handleNext}
          disabled={!nextToken || loading}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export default Alerts
