import { useState, useEffect } from 'react'
import { BASE_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import './Subscription.css'

const PLANS = [
  {
    type: 'FREE',
    label: 'Free',
    price: 0,
    description: 'Basic access with limited features.',
    features: ['Up to 2 strategies', 'Daily alerts', 'Email notifications'],
  },
  {
    type: 'STANDARD',
    label: 'Standard',
    price: 19,
    description: 'For active traders who need more power.',
    features: ['Up to 10 strategies', 'Real-time alerts', 'Email & SMS notifications', 'Advanced indicators'],
  },
  {
    type: 'PRO',
    label: 'Pro',
    price: 49,
    description: 'Full access for professional traders.',
    features: ['Unlimited strategies', 'Real-time alerts', 'All notification channels', 'Priority support', 'API access'],
  },
]

const STATUS_LABELS = {
  ACTIVE: { label: 'Active', cls: 'status-active' },
  TRIALING: { label: 'Trial', cls: 'status-trial' },
  PAST_DUE: { label: 'Past Due', cls: 'status-pastdue' },
  CANCELLED: { label: 'Cancelled', cls: 'status-cancelled' },
  EXPIRED: { label: 'Expired', cls: 'status-expired' },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function Subscription() {
  const { userId } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    fetch(`${BASE_URL}/subscriptions/user/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load subscription (${res.status})`)
        return res.json()
      })
      .then(data => {
        setSubscription(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  const handleChangePlan = (planType) => {
    if (subscription?.type === planType && subscription?.status !== 'CANCELLED') return
    setUpgrading(true)
    setSuccessMsg(null)
    setError(null)

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const isCancelled = subscription?.status === 'CANCELLED'
    const { subscriptionId: _sid, cancelledAt: _ca, cancelReason: _cr, ...baseFields } = subscription ?? {}
    const payload = {
      ...(isCancelled ? baseFields : (subscription ?? {})),
      type: planType,
      status: 'ACTIVE',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    }

    fetch(`${BASE_URL}/subscriptions/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to update subscription (${res.status})`)
        return res.json()
      })
      .then(data => {
        setSubscription(data)
        setUpgrading(false)
        setSuccessMsg(`Plan updated to ${planType}.`)
      })
      .catch(err => {
        setError(err.message)
        setUpgrading(false)
      })
  }

  const handleCancel = () => {
    if (!subscription || !window.confirm('Are you sure you want to cancel your subscription?')) return
    setCancelling(true)
    setSuccessMsg(null)
    setError(null)

    fetch(`${BASE_URL}/subscriptions/user/${userId}/${subscription.subscriptionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: 'User requested cancellation' }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to cancel subscription (${res.status})`)
        return res.json()
      })
      .then(() => {
        setSubscription(prev => ({ ...prev, status: 'CANCELLED', cancelledAt: new Date().toISOString() }))
        setCancelling(false)
        setSuccessMsg('Subscription cancelled.')
      })
      .catch(err => {
        setError(err.message)
        setCancelling(false)
      })
  }

  if (loading) return <div className="status-message">Loading subscription...</div>

  const statusInfo = STATUS_LABELS[subscription?.status] ?? { label: subscription?.status ?? 'Unknown', cls: '' }

  return (
    <div className="subscription-page">
      <h1>Subscription</h1>

      {error && <div className="status-message error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      {subscription && (
        <div className="current-subscription card">
          <div className="current-sub-header">
            <div>
              <span className="current-sub-label">Current Plan</span>
              <span className="current-sub-type">{subscription.type}</span>
            </div>
            <span className={`sub-status-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
          </div>

          <div className="sub-period-grid">
            <div className="sub-period-item">
              <span className="sub-period-label">Period Start</span>
              <span className="sub-period-value">{formatDate(subscription.currentPeriodStart)}</span>
            </div>
            <div className="sub-period-item">
              <span className="sub-period-label">Period End</span>
              <span className="sub-period-value">{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
            <div className="sub-period-item">
              <span className="sub-period-label">Next Invoice Due</span>
              <span className="sub-period-value">{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
            {subscription.trialEndsAt && (
              <div className="sub-period-item">
                <span className="sub-period-label">Trial Ends</span>
                <span className="sub-period-value">{formatDate(subscription.trialEndsAt)}</span>
              </div>
            )}
            {subscription.cancelledAt && (
              <div className="sub-period-item">
                <span className="sub-period-label">Cancelled At</span>
                <span className="sub-period-value">{formatDate(subscription.cancelledAt)}</span>
              </div>
            )}
          </div>

          {subscription.status !== 'CANCELLED' && (
            <button
              className="btn-cancel-sub"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      )}

      {!subscription && (
        <div className="no-subscription card">
          <p>You don't have an active subscription. Choose a plan below to get started.</p>
        </div>
      )}

      <h2 className="plans-heading">Available Plans</h2>
      <div className="plans-grid">
        {PLANS.map(plan => {
          const isCurrent = subscription?.type === plan.type
          return (
            <div key={plan.type} className={`plan-card card ${isCurrent ? 'plan-current' : ''}`}>
              <div className="plan-header">
                <span className="plan-label">{plan.label}</span>
                {isCurrent && <span className="plan-current-badge">Current</span>}
              </div>
              <div className="plan-price">
                {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={`btn-select-plan ${isCurrent && subscription?.status !== 'CANCELLED' ? 'btn-plan-current' : 'btn-plan-select'}`}
                onClick={() => handleChangePlan(plan.type)}
                disabled={(isCurrent && subscription?.status !== 'CANCELLED') || upgrading}
              >
                {isCurrent && subscription?.status !== 'CANCELLED' ? 'Current Plan' : upgrading ? 'Updating...' : 'Select Plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Subscription
