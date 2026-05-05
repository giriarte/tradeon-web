import { useState, useEffect } from 'react'
import { BASE_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import './Billing.css'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency ?? 'USD' }).format(amount)
}

const INVOICE_STATUS_CLASSES = {
  PAID: 'badge-paid',
  OPEN: 'badge-open',
  DRAFT: 'badge-draft',
  VOID: 'badge-void',
  UNCOLLECTIBLE: 'badge-uncollectible',
}

const PAYMENT_STATUS_CLASSES = {
  COMPLETED: 'badge-paid',
  PENDING: 'badge-open',
  FAILED: 'badge-uncollectible',
  REFUNDED: 'badge-void',
}

const METHOD_ICONS = {
  CREDIT_CARD: '💳',
  PAYPAL: 'P',
  CRYPTO: '₿',
}

function PaymentMethodCard({ method, onSetDefault, onRemove }) {
  const { type, isDefault, details, paymentMethodId } = method

  const label = () => {
    if (type === 'CREDIT_CARD') return `${details.brand?.toUpperCase() ?? 'Card'} •••• ${details.last4}`
    if (type === 'PAYPAL') return details.email
    if (type === 'CRYPTO') return `${details.coin} — ${details.walletAddress?.slice(0, 8)}...`
    return type
  }

  const sublabel = () => {
    if (type === 'CREDIT_CARD') return `Expires ${details.expiryMonth}/${details.expiryYear}`
    if (type === 'PAYPAL') return `Payer ID: ${details.payerId}`
    if (type === 'CRYPTO') return details.network
    return ''
  }

  return (
    <div className={`payment-method-card ${isDefault ? 'method-default' : ''}`}>
      <span className="method-icon">{METHOD_ICONS[type] ?? '?'}</span>
      <div className="method-info">
        <span className="method-label">{label()}</span>
        <span className="method-sublabel">{sublabel()}</span>
      </div>
      <div className="method-actions">
        {isDefault
          ? <span className="default-badge">Default</span>
          : <button className="btn-ghost" onClick={() => onSetDefault(paymentMethodId)}>Set Default</button>
        }
        <button className="btn-ghost btn-danger" onClick={() => onRemove(paymentMethodId)}>Remove</button>
      </div>
    </div>
  )
}

function AddPaymentMethodForm({ onAdd, onCancel }) {
  const [type, setType] = useState('CREDIT_CARD')
  const [fields, setFields] = useState({})

  const set = (k, v) => setFields(prev => ({ ...prev, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({ type, isDefault: false, details: fields })
  }

  return (
    <form className="add-method-form card" onSubmit={handleSubmit}>
      <h3>Add Payment Method</h3>

      <div className="form-group">
        <label>Type</label>
        <select value={type} onChange={e => { setType(e.target.value); setFields({}) }}>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="PAYPAL">PayPal</option>
          <option value="CRYPTO">Crypto</option>
        </select>
      </div>

      {type === 'CREDIT_CARD' && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Cardholder Name</label>
              <input required placeholder="John Doe" onChange={e => set('cardholderName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Brand</label>
              <input required placeholder="visa" onChange={e => set('brand', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Last 4 digits</label>
              <input required maxLength={4} placeholder="4242" onChange={e => set('last4', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Expiry Month</label>
              <input required type="number" min={1} max={12} placeholder="12" onChange={e => set('expiryMonth', parseInt(e.target.value, 10))} />
            </div>
            <div className="form-group">
              <label>Expiry Year</label>
              <input required type="number" min={2024} placeholder="2028" onChange={e => set('expiryYear', parseInt(e.target.value, 10))} />
            </div>
          </div>
          <div className="form-group">
            <label>Gateway Token</label>
            <input required placeholder="tok_..." onChange={e => set('token', e.target.value)} />
          </div>
        </>
      )}

      {type === 'PAYPAL' && (
        <div className="form-row">
          <div className="form-group">
            <label>PayPal Email</label>
            <input required type="email" placeholder="user@example.com" onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Payer ID</label>
            <input required placeholder="PAYERID123" onChange={e => set('payerId', e.target.value)} />
          </div>
        </div>
      )}

      {type === 'CRYPTO' && (
        <div className="form-row">
          <div className="form-group">
            <label>Network</label>
            <input required placeholder="ethereum" onChange={e => set('network', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Coin</label>
            <input required placeholder="USDT" onChange={e => set('coin', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Wallet Address</label>
            <input required placeholder="0xABC..." onChange={e => set('walletAddress', e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Add Method</button>
      </div>
    </form>
  )
}

function Billing() {
  const { userId } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${BASE_URL}/subscriptions/user/${userId}`).then(r => r.ok ? r.json() : null),
      fetch(`${BASE_URL}/payment-methods/user/${userId}`).then(r => r.ok ? r.json() : []),
      fetch(`${BASE_URL}/invoices/user/${userId}`).then(r => r.ok ? r.json() : []),
      fetch(`${BASE_URL}/payments/user/${userId}`).then(r => r.ok ? r.json() : []),
    ])
      .then(([sub, methods, invs, pays]) => {
        setSubscription(sub)
        setPaymentMethods(methods ?? [])
        setInvoices((invs ?? []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        setPayments((pays ?? []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  const handleSetDefault = (paymentMethodId) => {
    setSuccessMsg(null)
    fetch(`${BASE_URL}/payment-methods/user/${userId}/${paymentMethodId}/set-default`, { method: 'POST' })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to update default (${r.status})`)
        setPaymentMethods(prev => prev.map(m => ({ ...m, isDefault: m.paymentMethodId === paymentMethodId })))
        setSuccessMsg('Default payment method updated.')
      })
      .catch(err => setError(err.message))
  }

  const handleRemove = (paymentMethodId) => {
    if (!window.confirm('Remove this payment method?')) return
    setSuccessMsg(null)
    fetch(`${BASE_URL}/payment-methods/user/${userId}/${paymentMethodId}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok && r.status !== 204) throw new Error(`Failed to remove (${r.status})`)
        setPaymentMethods(prev => prev.filter(m => m.paymentMethodId !== paymentMethodId))
        setSuccessMsg('Payment method removed.')
      })
      .catch(err => setError(err.message))
  }

  const handleAddMethod = (payload) => {
    setSuccessMsg(null)
    fetch(`${BASE_URL}/payment-methods/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to add method (${r.status})`)
        return r.json()
      })
      .then(data => {
        setPaymentMethods(prev => [...prev, data])
        setShowAddMethod(false)
        setSuccessMsg('Payment method added.')
      })
      .catch(err => setError(err.message))
  }

  if (loading) return <div className="status-message">Loading billing...</div>

  const nextDueDate = subscription?.currentPeriodEnd

  return (
    <div className="billing-page">
      <h1>Billing</h1>

      {error && <div className="status-message error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      {nextDueDate && (
        <div className="next-due-banner">
          <span className="next-due-label">Next Invoice Due</span>
          <span className="next-due-date">{formatDate(nextDueDate)}</span>
        </div>
      )}

      {/* Payment Methods */}
      <section className="billing-section card">
        <div className="section-header">
          <h2>Payment Methods</h2>
          <button className="btn-add-method" onClick={() => setShowAddMethod(v => !v)}>
            {showAddMethod ? 'Cancel' : '+ Add Method'}
          </button>
        </div>

        {showAddMethod && (
          <AddPaymentMethodForm onAdd={handleAddMethod} onCancel={() => setShowAddMethod(false)} />
        )}

        {paymentMethods.length === 0 && !showAddMethod && (
          <p className="empty-state">No payment methods on file.</p>
        )}

        <div className="methods-list">
          {paymentMethods.map(m => (
            <PaymentMethodCard
              key={m.paymentMethodId}
              method={m}
              onSetDefault={handleSetDefault}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section className="billing-section card">
        <h2>Invoices</h2>

        {invoices.length === 0 && <p className="empty-state">No invoices found.</p>}

        {invoices.length > 0 && (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.invoiceId}>
                  <td className="mono">{inv.invoiceId}</td>
                  <td>{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</td>
                  <td>{formatAmount(inv.amount, inv.currency)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td><span className={`badge ${INVOICE_STATUS_CLASSES[inv.status] ?? ''}`}>{inv.status}</span></td>
                  <td>{formatDate(inv.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Payment History */}
      <section className="billing-section card">
        <h2>Payment History</h2>

        {payments.length === 0 && <p className="empty-state">No payment records found.</p>}

        {payments.length > 0 && (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Processed At</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const method = paymentMethods.find(m => m.paymentMethodId === p.paymentMethodId)
                const methodLabel = method
                  ? method.type === 'CREDIT_CARD'
                    ? `•••• ${method.details.last4}`
                    : method.type === 'PAYPAL'
                      ? method.details.email
                      : method.details.coin
                  : p.paymentMethodId

                return (
                  <tr key={p.paymentId}>
                    <td className="mono">{p.paymentId}</td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{formatAmount(p.amount, p.currency)}</td>
                    <td>{methodLabel}</td>
                    <td><span className={`badge ${PAYMENT_STATUS_CLASSES[p.status] ?? ''}`}>{p.status}</span></td>
                    <td>{formatDate(p.processedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Billing
