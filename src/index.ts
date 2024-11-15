import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import supabase, { ADMIN, SignClient } from './util.js'
import fs from 'fs'
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
  // {
    //   eoa: '0x915B5A9a2485FDb2B68f06Cb21F09aF272ba7b08',
    //   owner: '0x12a2909c0F1fC6261DD7b940F6dB6f3b2C7aa83D'
    // }
  // await fs.writeFile('/tmp/body.json', JSON.stringify(body, null, 2))
  return c.json({verified: true})
})


app.post('/connect', async (c) => {
  const body = await c.req.json()
  console.log(body)
  fs.writeFileSync('/tmp/body.json', JSON.stringify(body, null, 2))


  const attest_index = body.sign_protocol_info.attestation.indexingValue
  const [_, owner, eoa] = attest_index.split(':')

  const connectedAccount = await supabase.from('connected_accounts')
    .select()
    .eq('owner', owner.toLowerCase())
    .eq('eoa', eoa.toLowerCase())
    .maybeSingle()
    .then((res: any) => {
      if (res.error) {
        console.error(res.error)
        return c.json({error: res.error.message})
      } else {
        return res.data
      }
    })

  if (connectedAccount) {
    return c.json({connectedAccount})
  }

  // const res = await SignClient.createAttestation(body.sign_protocol_info.attestation, {
  //   delegationSignature: body.sign_protocol_info.delegationSignature,
  // })
  // console.log(res)
  const connectedAccounts = await supabase.from('connected_accounts').insert({
    owner: owner.toLowerCase(),
    eoa: eoa.toLowerCase(),
    attest_index,
  })
    .select()
    .single()
    .then((res: any) => {
      if (res.error) {
        console.error(res.error)
        return c.json({error: res.error.message})
      } else {
        return res.data
      }
    })

    return c.json({connectedAccounts})
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
