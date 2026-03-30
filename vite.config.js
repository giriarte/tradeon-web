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

function mockApiPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/users/user-001', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(JSON.stringify(mockUser))
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const updated = JSON.parse(body)
              Object.assign(mockUser, updated)
              res.end(JSON.stringify(mockUser))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
            }
          })
        } else {
          res.statusCode = 405
          res.end()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()]
})
