const { randomUUID } = require('crypto')
const express = require('express')
const cors = require('cors')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')

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
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`tradeon-server running on http://localhost:${PORT}`)
})
