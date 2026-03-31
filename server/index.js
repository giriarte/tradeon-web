const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// ---------------------------------------------------------------------------
// In-memory data (replace with database later)
// ---------------------------------------------------------------------------

const users = {
  'user-001': {
    userId: 'user-001',
    firstName: 'Alice',
    lastName: 'Trader',
    email: 'alice.trader@example.com',
    phoneNumber: '+1-555-0100',
    notificationChannels: [
      { channelId: 'ch-1', type: 'Email', value: 'alice.trader@example.com' },
      { channelId: 'ch-2', type: 'SMS', value: '+1-555-0100' },
    ],
  },
}

const strategies = {
  'strat-001': {
    userId: 'user-001',
    strategyId: 'strat-001',
    name: 'BTC Momentum',
    type: 'CRYPTO',
    symbols: ['BTC/USDT', 'ETH/USDT'],
    candleInterval: '1h',
    cooldownInterval: 5,
    baseIndicators: [
      { name: 'RSI', offset: 0, params: { rsi_length: '14', rsi_overbought: '70', rsi_oversold: '30' } },
      { name: 'MACD', offset: 0, params: { macd_fast: '12', macd_slow: '26', macd_signal: '9' } },
    ],
    defaultParams: { threshold: '70', lookback: '5' },
    notificationChannel: { channelId: 'ch-1', type: 'Email', value: 'alice.trader@example.com' },
    enabled: true,
  },
  'strat-002': {
    userId: 'user-001',
    strategyId: 'strat-002',
    name: 'EUR/USD Breakout',
    type: 'FOREX',
    symbols: ['EUR/USD', 'GBP/USD'],
    candleInterval: '4h',
    cooldownInterval: 15,
    baseIndicators: [
      { name: 'BollingerBandReEntry', offset: 1, params: { bb_length: '26', bb_variation_min: '1.0' } },
    ],
    defaultParams: { minVolume: '1000' },
    notificationChannel: { channelId: 'ch-2', type: 'SMS', value: '+1-555-0100' },
    enabled: false,
  },
}

// ---------------------------------------------------------------------------
// User routes
// ---------------------------------------------------------------------------

// GET /api/users/:userId
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/users/${userId}`)

  const user = users[userId]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

// POST /api/users/:userId
app.post('/api/users/:userId', (req, res) => {
  const { userId } = req.params
  console.log(`[POST] /api/users/${userId}`, req.body)

  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' })
  }
  users[userId] = { ...users[userId], ...req.body }
  res.json(users[userId])
})

// ---------------------------------------------------------------------------
// Strategy routes
// ---------------------------------------------------------------------------

// GET /api/strategies/user/:userId  — list strategies for a user
app.get('/api/strategies/user/:userId', (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/strategies/user/${userId}`)

  const list = Object.values(strategies)
    .filter(s => s.userId === userId)
    .map(({ strategyId, name, enabled }) => ({ strategyId, name, enabled }))
  res.json(list)
})

// GET /api/strategies/:strategyId
app.get('/api/strategies/:strategyId', (req, res) => {
  const { strategyId } = req.params
  console.log(`[GET] /api/strategies/${strategyId}`)

  const strategy = strategies[strategyId]
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' })
  }
  res.json(strategy)
})

// POST /api/strategies/:strategyId
app.post('/api/strategies/:strategyId', (req, res) => {
  const { strategyId } = req.params
  console.log(`[POST] /api/strategies/${strategyId}`, req.body)

  strategies[strategyId] = { ...strategies[strategyId], ...req.body }
  res.json(strategies[strategyId])
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`tradeon-server running on http://localhost:${PORT}`)
})
