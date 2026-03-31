import { useState, useEffect } from 'react'
import { BASE_URL, USER_ID } from '../config'
import './StrategyManagement.css'

const FIELD_INFO = {
  userId: 'The user this strategy belongs to (read-only).',
  strategyId: 'Unique identifier for this strategy (read-only).',
  name: 'Display name for this strategy.',
  type: 'Asset class type. Changing this updates the available trading symbols.',
  symbols: 'Trading pairs/symbols to monitor. Options depend on the selected type.',
  candleInterval: 'Candlestick interval used for analysis (e.g. 1m, 5m, 1h, 4h, 1d).',
  baseIndicators: 'Technical indicators (conditions) that must all be met to trigger this strategy.',
  defaultParams: 'Customizable key/value parameters for the indicators in this strategy.',
  notificationChannel: 'Channel to receive alerts on. Create more channels in User Profile.',
  enabled: 'Whether this strategy is actively monitoring the market.',
  cooldownInterval: 'Minimum minutes between consecutive notifications for this strategy (default: 5).',
}

function InfoTooltip({ field, text }) {
  const content = text ?? FIELD_INFO[field]
  return (
    <span className="info-tooltip-wrapper">
      <span className="info-icon">i</span>
      <span className="tooltip-text">{content}</span>
    </span>
  )
}

function StrategyManagement() {
  const [strategies, setStrategies] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [userChannels, setUserChannels] = useState([])
  const [availablePairs, setAvailablePairs] = useState({})
  const [availableIndicators, setAvailableIndicators] = useState({})
  const [newIndicatorName, setNewIndicatorName] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingForm, setLoadingForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/strategies/user/${USER_ID}`).then(r => { if (!r.ok) throw new Error(`Failed to load strategies (${r.status})`); return r.json() }),
      fetch(`${BASE_URL}/users/${USER_ID}`).then(r => { if (!r.ok) throw new Error(`Failed to load user (${r.status})`); return r.json() }),
      fetch('/availablePairs.json').then(r => r.json()),
      fetch('/availableIndicators.json').then(r => r.json()),
    ])
      .then(([stratList, userProfile, pairs, indicators]) => {
        setStrategies(stratList)
        setUserChannels(userProfile.notificationChannels ?? [])
        setAvailablePairs(pairs)
        setAvailableIndicators(indicators)
        setLoadingList(false)
      })
      .catch(err => {
        setError(err.message)
        setLoadingList(false)
      })
  }, [])

  const loadStrategy = (strategyId) => {
    setSelectedId(strategyId)
    setStrategy(null)
    setLoadingForm(true)
    setSaveSuccess(false)
    fetch(`${BASE_URL}/strategies/${strategyId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load strategy (${r.status})`); return r.json() })
      .then(data => { setStrategy(data); setLoadingForm(false) })
      .catch(err => { setError(err.message); setLoadingForm(false) })
  }

  const handleFieldChange = (field, value) => {
    setStrategy(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  const handleTypeChange = (type) => {
    setStrategy(prev => ({ ...prev, type, symbols: [] }))
    setSaveSuccess(false)
  }

  const handleSymbolToggle = (symbol) => {
    setStrategy(prev => {
      const current = prev.symbols ?? []
      const updated = current.includes(symbol)
        ? current.filter(s => s !== symbol)
        : [...current, symbol]
      return { ...prev, symbols: updated }
    })
    setSaveSuccess(false)
  }

  const handleParamChange = (key, value) => {
    setStrategy(prev => ({ ...prev, defaultParams: { ...prev.defaultParams, [key]: value } }))
    setSaveSuccess(false)
  }

  const handleParamKeyRename = (oldKey, newKey) => {
    setStrategy(prev => {
      const entries = Object.entries(prev.defaultParams ?? {})
      const rebuilt = Object.fromEntries(entries.map(([k, v]) => [k === oldKey ? newKey : k, v]))
      return { ...prev, defaultParams: rebuilt }
    })
    setSaveSuccess(false)
  }

  const addParam = () => {
    setStrategy(prev => ({ ...prev, defaultParams: { ...prev.defaultParams, '': '' } }))
  }

  const removeParam = (key) => {
    setStrategy(prev => {
      const params = { ...prev.defaultParams }
      delete params[key]
      return { ...prev, defaultParams: params }
    })
    setSaveSuccess(false)
  }

  const addIndicator = () => {
    if (!newIndicatorName) return
    const defaultParams = Object.fromEntries(
      Object.entries(availableIndicators[newIndicatorName] ?? {}).map(([k, v]) => [k, v.default ?? ''])
    )
    setStrategy(prev => ({
      ...prev,
      baseIndicators: [...(prev.baseIndicators ?? []), { name: newIndicatorName, offset: 0, params: defaultParams }],
    }))
    setNewIndicatorName('')
    setSaveSuccess(false)
  }

  const removeIndicator = (index) => {
    setStrategy(prev => ({ ...prev, baseIndicators: prev.baseIndicators.filter((_, i) => i !== index) }))
    setSaveSuccess(false)
  }

  const handleIndicatorOffsetChange = (index, value) => {
    setStrategy(prev => {
      const indicators = [...prev.baseIndicators]
      indicators[index] = { ...indicators[index], offset: parseInt(value, 10) || 0 }
      return { ...prev, baseIndicators: indicators }
    })
    setSaveSuccess(false)
  }

  const handleIndicatorParamChange = (index, key, value) => {
    setStrategy(prev => {
      const indicators = [...prev.baseIndicators]
      indicators[index] = { ...indicators[index], params: { ...indicators[index].params, [key]: value } }
      return { ...prev, baseIndicators: indicators }
    })
    setSaveSuccess(false)
  }

  const handleSave = () => {
    setSaving(true)
    setSaveSuccess(false)
    fetch(`${BASE_URL}/strategies/${strategy.strategyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy),
    })
      .then(r => { if (!r.ok) throw new Error(`Failed to save strategy (${r.status})`); return r.json() })
      .then(data => {
        setStrategy(data)
        setStrategies(prev => prev.map(s => s.strategyId === data.strategyId ? { ...s, name: data.name, enabled: data.enabled } : s))
        setSaving(false)
        setSaveSuccess(true)
      })
      .catch(err => { setError(err.message); setSaving(false) })
  }

  const pairsForType = availablePairs[strategy?.type] ?? []

  if (loadingList) return <div className="status-message">Loading strategies...</div>
  if (error) return <div className="status-message error-message">{error}</div>

  return (
    <div className="strategy-management">
      <h1>Strategy Management</h1>
      <div className="sm-layout">

        <aside className="strategy-list">
          <h2>Your Strategies</h2>
          {strategies.length === 0 && <p className="empty-list">No strategies found.</p>}
          {strategies.map(s => (
            <button
              key={s.strategyId}
              className={`strategy-item${selectedId === s.strategyId ? ' active' : ''}`}
              onClick={() => loadStrategy(s.strategyId)}
            >
              <span className="strategy-item-name">{s.name}</span>
              <span className={`strategy-badge${s.enabled ? ' badge-on' : ' badge-off'}`}>
                {s.enabled ? 'ON' : 'OFF'}
              </span>
            </button>
          ))}
        </aside>

        <section className="strategy-form-panel">
          {!selectedId && (
            <div className="no-selection">Select a strategy from the list to view and edit it.</div>
          )}
          {selectedId && loadingForm && (
            <div className="status-message">Loading strategy...</div>
          )}
          {selectedId && !loadingForm && strategy && (
            <div className="strategy-form">

              {/* Identity */}
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>User ID <InfoTooltip field="userId" /></label>
                    <input type="text" value={strategy.userId ?? ''} readOnly className="input-readonly" />
                  </div>
                  <div className="form-group">
                    <label>Strategy ID <InfoTooltip field="strategyId" /></label>
                    <input type="text" value={strategy.strategyId ?? ''} readOnly className="input-readonly" />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label>Name <InfoTooltip field="name" /></label>
                    <input
                      type="text"
                      value={strategy.name ?? ''}
                      onChange={e => handleFieldChange('name', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Type + Symbols */}
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group form-group-narrow">
                    <label>Type <InfoTooltip field="type" /></label>
                    <select value={strategy.type ?? ''} onChange={e => handleTypeChange(e.target.value)}>
                      <option value="CRYPTO">CRYPTO</option>
                      <option value="FOREX">FOREX</option>
                      <option value="STOCKS">STOCKS</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>Symbols <InfoTooltip field="symbols" /></label>
                  <div className="symbols-grid">
                    {pairsForType.length === 0 && <span className="empty-list">No pairs available.</span>}
                    {pairsForType.map(pair => (
                      <label key={pair} className="symbol-checkbox">
                        <input
                          type="checkbox"
                          checked={(strategy.symbols ?? []).includes(pair)}
                          onChange={() => handleSymbolToggle(pair)}
                        />
                        {pair}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group form-group-narrow">
                    <label>Candle Interval <InfoTooltip field="candleInterval" /></label>
                    <select
                      value={strategy.candleInterval ?? ''}
                      onChange={e => handleFieldChange('candleInterval', e.target.value)}
                    >
                      <option value="">— Select —</option>
                      {['1m','2m','5m','15m','30m','1h','4h','12h','1d'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group form-group-narrow">
                    <label>Cooldown (min) <InfoTooltip field="cooldownInterval" /></label>
                    <input
                      type="number"
                      min={1}
                      value={strategy.cooldownInterval ?? 5}
                      onChange={e => handleFieldChange('cooldownInterval', parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
              </div>

              {/* Base Indicators */}
              <div className="form-section">
                <h2>Base Indicators <InfoTooltip field="baseIndicators" /></h2>
                {(!strategy.baseIndicators || strategy.baseIndicators.length === 0) && (
                  <p className="empty-list">No indicators configured.</p>
                )}
                {strategy.baseIndicators?.map((ind, i) => (
                  <div key={i} className="indicator-row">
                    <div className="indicator-row-header">
                      <span className="indicator-row-name">{ind.name}</span>
                      <div className="indicator-offset-group">
                        <label>Offset</label>
                        <input
                          type="number"
                          value={ind.offset ?? 0}
                          onChange={e => handleIndicatorOffsetChange(i, e.target.value)}
                          className="indicator-offset-input"
                        />
                      </div>
                      <button className="btn-remove-sm" onClick={() => removeIndicator(i)}>✕ Remove</button>
                    </div>
                    {Object.keys(ind.params ?? {}).length > 0 && (
                      <div className="indicator-params">
                        {Object.entries(ind.params).map(([key, val]) => {
                          const paramDef = availableIndicators[ind.name]?.[key]
                          return (
                            <div key={key} className="indicator-param-item">
                              <label>
                                {key}
                                {paramDef?.description && <InfoTooltip text={paramDef.description} />}
                              </label>
                              <input
                                type="text"
                                value={String(val)}
                                onChange={e => handleIndicatorParamChange(i, key, e.target.value)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <div className="add-indicator-row">
                  <select value={newIndicatorName} onChange={e => setNewIndicatorName(e.target.value)}>
                    <option value="">— Select indicator —</option>
                    {Object.keys(availableIndicators).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <button className="btn-add" onClick={addIndicator} disabled={!newIndicatorName}>
                    + Add Indicator
                  </button>
                </div>
              </div>

              {/* Default Params */}
              <div className="form-section">
                <h2>Default Parameters <InfoTooltip field="defaultParams" /></h2>
                {Object.entries(strategy.defaultParams ?? {}).map(([key, val]) => (
                  <div key={key} className="param-row">
                    <input
                      type="text"
                      value={key}
                      onChange={e => handleParamKeyRename(key, e.target.value)}
                      placeholder="key"
                      className="param-key"
                    />
                    <span className="param-sep">=</span>
                    <input
                      type="text"
                      value={String(val)}
                      onChange={e => handleParamChange(key, e.target.value)}
                      placeholder="value"
                      className="param-value"
                    />
                    <button className="btn-remove-sm" onClick={() => removeParam(key)}>✕</button>
                  </div>
                ))}
                <button className="btn-add" onClick={addParam}>+ Add Parameter</button>
              </div>

              {/* Notification + Enabled */}
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Notification Channel <InfoTooltip field="notificationChannel" /></label>
                    <select
                      value={strategy.notificationChannel?.channelId ?? ''}
                      onChange={e => {
                        const ch = userChannels.find(c => c.channelId === e.target.value) ?? null
                        handleFieldChange('notificationChannel', ch)
                      }}
                    >
                      <option value="">— None —</option>
                      {userChannels.map(ch => (
                        <option key={ch.channelId} value={ch.channelId}>{ch.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group form-group-narrow">
                    <label>Enabled <InfoTooltip field="enabled" /></label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={strategy.enabled ?? false}
                        onChange={e => handleFieldChange('enabled', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                {saveSuccess && <span className="save-success">Strategy saved successfully.</span>}
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default StrategyManagement
