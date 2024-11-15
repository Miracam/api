import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ADMIN } from './util.js'
const app = new Hono()

app.use('*', cors({
  origin: '*',  // Allow all origins
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
  credentials: true,
}))

app.post('/lit', async (c) => {
  const body = await c.req.json()
  console.log(body)
  // await fs.writeFile('/tmp/body.json', JSON.stringify(body, null, 2))
  return c.json({verified: true})
})

app.post('/approval', (c) => {
  return c.text('Hello Hono!')
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
