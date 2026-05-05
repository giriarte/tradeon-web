const { randomUUID, scryptSync, randomBytes } = require('crypto')
const express = require('express')
const cors = require('cors')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, BatchGetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ---------------------------------------------------------------------------
// DynamoDB setup
// ---------------------------------------------------------------------------

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })
const ddb = DynamoDBDocumentClient.from(ddbClient)

const USERS_TABLE = process.env.USERS_TABLE
const STRATEGIES_TABLE = process.env.STRATEGIES_TABLE
const USERS_USERID_GSI = process.env.USERS_USERID_GSI
const ALERTS_TABLE = process.env.ALERTS_TABLE
const ALERTS_USERID_GSI = process.env.ALERTS_USERID_GSI
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE
const PAYMENT_METHODS_TABLE = process.env.PAYMENT_METHODS_TABLE
const INVOICES_TABLE = process.env.INVOICES_TABLE
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  console.log(`[POST] /api/auth/login`, { email })

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }))

    const user = result.Items?.[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const [salt, storedHash] = user.password.split(':')
    const inputHash = scryptSync(password, salt, 64).toString('hex')
    if (inputHash !== storedHash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account not confirmed. Please check your email.' })
    }

    const { password: _, ...safeUser } = user
    res.json(safeUser)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body
  console.log(`[POST] /api/auth/signup`, { firstName, lastName, email, phone })

  try {
    // Check if email is already registered
    const existing = await ddb.send(new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }))
    if (existing.Items && existing.Items.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' })
    }

    // Hash password with a random salt
    const salt = randomBytes(16).toString('hex')
    const hashedPassword = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`

    const userId = `user-${randomUUID().slice(0, 8)}`
    const item = {
      email,
      userId,
      firstName,
      lastName,
      phoneNumber: phone,
      password: hashedPassword,
      notificationChannels: [],
      active: false,
      createdAt: new Date().toISOString(),
    }

    await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }))

    const { password: _, ...safeItem } = item
    res.status(201).json(safeItem)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/confirm/:userId
app.post('/api/auth/confirm/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[POST] /api/auth/confirm/${userId}`)

  try {
    // Resolve the full primary key via the userId GSI
    const result = await ddb.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: USERS_USERID_GSI,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: 1,
    }))

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { email } = result.Items[0]

    await ddb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email, userId },
      UpdateExpression: 'SET active = :true',
      ExpressionAttributeValues: { ':true': true },
    }))

    res.json({ message: 'Account confirmed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body
  console.log(`[POST] /api/auth/forgot-password`, { email })
  res.json({ message: 'Password reset request received' })
})

// ---------------------------------------------------------------------------
// User routes
// ---------------------------------------------------------------------------

// GET /api/users/:userId
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/users/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: USERS_USERID_GSI,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { email, userId: resolvedUserId } = result.Items[0]
    const full = await ddb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { email, userId: resolvedUserId },
    }))

    if (!full.Item) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(full.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/users/:userId
app.post('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[POST] /api/users/${userId}`, req.body)

  try {
    const channels = (req.body.notificationChannels ?? []).map(ch => ({
      ...ch,
      channelId: ch.channelId || randomUUID(),
    }))
    const item = { ...req.body, userId, notificationChannels: channels }
    await ddb.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    }))
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Alerts routes
// ---------------------------------------------------------------------------

// GET /api/alerts/user/:userId?limit=10&nextToken=...
app.get('/api/alerts/user/:userId', async (req, res) => {
  const { userId } = req.params
  const limit = parseInt(req.query.limit, 10) || 10
  const nextToken = req.query.nextToken
  console.log(`[GET] /api/alerts/user/${userId}`)

  try {
    const params = {
      TableName: ALERTS_TABLE,
      IndexName: ALERTS_USERID_GSI,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: limit,
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'))
    }

    const result = await ddb.send(new QueryCommand(params))

    const keys = (result.Items ?? []).map(({ strategyId, alertId }) => ({ strategyId, alertId }))

    let fullItems = []
    if (keys.length) {
      const batchResult = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [ALERTS_TABLE]: { Keys: keys },
        },
      }))
      fullItems = batchResult.Responses?.[ALERTS_TABLE] ?? []
      // restore original GSI order
      const order = new Map(keys.map(({ alertId }, i) => [alertId, i]))
      fullItems.sort((a, b) => (order.get(a.alertId) ?? 0) - (order.get(b.alertId) ?? 0))
    }

    const responseNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null

    res.json({ items: fullItems, nextToken: responseNextToken })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Strategy routes
// ---------------------------------------------------------------------------

// POST /api/strategies/user/:userId  — create a new strategy for a user
app.post('/api/strategies/user/:userId', async (req, res) => {
  const { userId } = req.params
  const { name } = req.body
  console.log(`[POST] /api/strategies/user/${userId}`, req.body)

  const strategyId = `strat-${randomUUID().slice(0, 8)}`
  const item = {
    userId,
    strategyId,
    name: name || 'New Strategy',
    type: 'CRYPTO',
    symbols: [],
    candleInterval: '1h',
    cooldownInterval: 5,
    baseIndicators: [],
    defaultParams: {},
    notificationChannel: null,
    enabled: false,
  }

  try {
    await ddb.send(new PutCommand({ TableName: STRATEGIES_TABLE, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/strategies/user/:userId  — list strategies for a user
app.get('/api/strategies/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/strategies/user/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: STRATEGIES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ProjectionExpression: 'strategyId, #n, enabled',
      ExpressionAttributeNames: { '#n': 'name' }, // 'name' is a reserved word in DynamoDB
    }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/strategies/:userId/:strategyId
app.get('/api/strategies/:userId/:strategyId', async (req, res) => {
  const { userId, strategyId } = req.params
  console.log(`[GET] /api/strategies/${userId}/${strategyId}`)

  try {
    const result = await ddb.send(new GetCommand({
      TableName: STRATEGIES_TABLE,
      Key: { userId, strategyId },
    }))

    if (!result.Item) {
      return res.status(404).json({ error: 'Strategy not found' })
    }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/strategies/:userId/:strategyId
app.post('/api/strategies/:userId/:strategyId', async (req, res) => {
  const { userId, strategyId } = req.params
  console.log(`[POST] /api/strategies/${userId}/${strategyId}`, req.body)

  try {
    const item = { ...req.body, userId, strategyId }
    await ddb.send(new PutCommand({
      TableName: STRATEGIES_TABLE,
      Item: item,
    }))
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/strategies/:userId/:strategyId
app.delete('/api/strategies/:userId/:strategyId', async (req, res) => {
  const { userId, strategyId } = req.params
  console.log(`[DELETE] /api/strategies/${userId}/${strategyId}`)

  try {
    await ddb.send(new DeleteCommand({
      TableName: STRATEGIES_TABLE,
      Key: { userId, strategyId },
    }))
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Subscription routes
// ---------------------------------------------------------------------------

// GET /api/subscriptions/user/:userId — get active subscription for a user
app.get('/api/subscriptions/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/subscriptions/user/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))

    const items = result.Items ?? []
    // Return the most recent active subscription, falling back to any item
    const active = items.find(s => s.status === 'ACTIVE') ?? items[0] ?? null
    res.json(active)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/subscriptions/user/:userId — create or update a subscription
app.post('/api/subscriptions/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[POST] /api/subscriptions/user/${userId}`, req.body)

  try {
    const subscriptionId = req.body.subscriptionId || `sub-${randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const item = {
      ...req.body,
      userId,
      subscriptionId,
      updatedAt: now,
      createdAt: req.body.createdAt || now,
    }
    await ddb.send(new PutCommand({ TableName: SUBSCRIPTIONS_TABLE, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/subscriptions/user/:userId/:subscriptionId/cancel — cancel a subscription
app.post('/api/subscriptions/user/:userId/:subscriptionId/cancel', async (req, res) => {
  const { userId, subscriptionId } = req.params
  const { cancelReason } = req.body
  console.log(`[POST] /api/subscriptions/user/${userId}/${subscriptionId}/cancel`)

  try {
    const now = new Date().toISOString()
    await ddb.send(new UpdateCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { userId, subscriptionId },
      UpdateExpression: 'SET #status = :cancelled, cancelledAt = :now, updatedAt = :now, cancelReason = :reason',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':cancelled': 'CANCELLED',
        ':now': now,
        ':reason': cancelReason || '',
      },
    }))
    res.json({ message: 'Subscription cancelled' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Payment method routes
// ---------------------------------------------------------------------------

// GET /api/payment-methods/user/:userId
app.get('/api/payment-methods/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/payment-methods/user/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: PAYMENT_METHODS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/payment-methods/user/:userId — add a payment method
app.post('/api/payment-methods/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[POST] /api/payment-methods/user/${userId}`, req.body)

  try {
    const paymentMethodId = `pm-${randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const item = { ...req.body, userId, paymentMethodId, createdAt: now, updatedAt: now }
    await ddb.send(new PutCommand({ TableName: PAYMENT_METHODS_TABLE, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/payment-methods/user/:userId/:paymentMethodId/set-default
app.post('/api/payment-methods/user/:userId/:paymentMethodId/set-default', async (req, res) => {
  const { userId, paymentMethodId } = req.params
  console.log(`[POST] /api/payment-methods/user/${userId}/${paymentMethodId}/set-default`)

  try {
    // Fetch all methods to unset existing default
    const all = await ddb.send(new QueryCommand({
      TableName: PAYMENT_METHODS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))

    const now = new Date().toISOString()
    await Promise.all((all.Items ?? []).map(item =>
      ddb.send(new UpdateCommand({
        TableName: PAYMENT_METHODS_TABLE,
        Key: { userId, paymentMethodId: item.paymentMethodId },
        UpdateExpression: 'SET isDefault = :val, updatedAt = :now',
        ExpressionAttributeValues: {
          ':val': item.paymentMethodId === paymentMethodId,
          ':now': now,
        },
      }))
    ))

    res.json({ message: 'Default payment method updated' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/payment-methods/user/:userId/:paymentMethodId
app.delete('/api/payment-methods/user/:userId/:paymentMethodId', async (req, res) => {
  const { userId, paymentMethodId } = req.params
  console.log(`[DELETE] /api/payment-methods/user/${userId}/${paymentMethodId}`)

  try {
    await ddb.send(new DeleteCommand({
      TableName: PAYMENT_METHODS_TABLE,
      Key: { userId, paymentMethodId },
    }))
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Invoice routes
// ---------------------------------------------------------------------------

// GET /api/invoices/user/:userId
app.get('/api/invoices/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/invoices/user/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: INVOICES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/invoices/user/:userId/:invoiceId
app.get('/api/invoices/user/:userId/:invoiceId', async (req, res) => {
  const { userId, invoiceId } = req.params
  console.log(`[GET] /api/invoices/user/${userId}/${invoiceId}`)

  try {
    const result = await ddb.send(new GetCommand({
      TableName: INVOICES_TABLE,
      Key: { userId, invoiceId },
    }))
    if (!result.Item) return res.status(404).json({ error: 'Invoice not found' })
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Payment history routes
// ---------------------------------------------------------------------------

// GET /api/payments/user/:userId
app.get('/api/payments/user/:userId', async (req, res) => {
  const { userId } = req.params
  console.log(`[GET] /api/payments/user/${userId}`)

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: PAYMENTS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`tradeon-server running on http://localhost:${PORT}`)
})
