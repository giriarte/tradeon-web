import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mockUser = {
  userId: 'user-001',
  firstName: 'Alice',
  lastName: 'Trader',
  email: 'alice.trader@example.com',
  phoneNumber: '+1-555-0100',
  notificationChannels: [
    { channelId: 'ch-1', type: 'Email', value: 'alice.trader@example.com' },
    { channelId: 'ch-2', type: 'SMS', value: '+1-555-0100' },
  ],
}

const mockStrategies = {
  'strat-001': {
    userId: 'user-001',
    strategyId: 'strat-001',
    name: 'BTC Momentum',
    type: 'CRYPTO',
    symbols: ['BTC/USDT', 'ETH/USDT'],
    candleInterval: '1h',
    baseIndicators: [
      { name: 'RSI', offset: 0, params: { rsi_length: '14', rsi_overbought: '70', rsi_oversold: '30' } },
      { name: 'MACD', offset: 0, params: { macd_fast: '12', macd_slow: '26', macd_signal: '9' } },
    ],
    defaultParams: { threshold: '70', lookback: '5' },
    notificationChannel: { channelId: 'ch-1', type: 'Email', value: 'alice.trader@example.com' },
    enabled: true,
    cooldownInterval: 5,
  },
  'strat-002': {
    userId: 'user-001',
    strategyId: 'strat-002',
    name: 'EUR/USD Breakout',
    type: 'FOREX',
    symbols: ['EUR/USD', 'GBP/USD'],
    candleInterval: '4h',
    baseIndicators: [
      { name: 'BollingerBandReEntry', offset: 1, params: { bb_length: '26', bb_variation_min: '1.0' } },
    ],
    defaultParams: { minVolume: '1000' },
    notificationChannel: { channelId: 'ch-2', type: 'SMS', value: '+1-555-0100' },
    enabled: false,
    cooldownInterval: 15,
  },
}

function replyJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch (e) { reject(e) }
    })
  })
}

function mockApiPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {

      // User endpoint: /api/users/user-001
      server.middlewares.use('/api/users/user-001', async (req, res) => {
        if (req.method === 'GET') {
          replyJson(res, 200, mockUser)
        } else if (req.method === 'POST') {
          try {
            const body = await readBody(req)
            Object.assign(mockUser, body)
            replyJson(res, 200, mockUser)
          } catch {
            replyJson(res, 400, { error: 'Invalid JSON' })
          }
        } else {
          replyJson(res, 405, { error: 'Method not allowed' })
        }
      })

      // Strategy endpoints: /api/strategies/...
      // req.url inside this handler is the path after /api/strategies
      server.middlewares.use('/api/strategies', async (req, res, next) => {
        const path = req.url  // e.g. '/user/user-001'  or  '/strat-001'

        // GET /api/strategies/user/:userId
        const userListMatch = path.match(/^\/user\/([^/?]+)/)
        if (userListMatch && req.method === 'GET') {
          const userId = userListMatch[1]
          const list = Object.values(mockStrategies)
            .filter(s => s.userId === userId)
            .map(({ strategyId, name, enabled }) => ({ strategyId, name, enabled }))
          replyJson(res, 200, list)
          return
        }

        // GET or POST /api/strategies/:strategyId
        const stratMatch = path.match(/^\/([^/?]+)$/)
        if (stratMatch) {
          const id = stratMatch[1]
          if (req.method === 'GET') {
            if (!mockStrategies[id]) { replyJson(res, 404, { error: 'Not found' }); return }
            replyJson(res, 200, mockStrategies[id])
          } else if (req.method === 'POST') {
            try {
              const body = await readBody(req)
              mockStrategies[id] = { ...mockStrategies[id], ...body }
              replyJson(res, 200, mockStrategies[id])
            } catch {
              replyJson(res, 400, { error: 'Invalid JSON' })
            }
          } else {
            replyJson(res, 405, { error: 'Method not allowed' })
          }
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
})
