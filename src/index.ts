import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import supabase, { ADMIN, SignClient } from './util.js'
import * as crypto from 'crypto'
import { verifyAttestation } from './attestation.js'
import * as Irys from './irys.js'
import * as Attester from './attester.js'



import fs from 'fs'
import { mintCamNFT } from './nft.js'
const app = new Hono()

app.use('*', cors({
  origin: '*',  // Allow all origins
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
  credentials: true,
}))


app.post('/publish', async (c) => {
  console.log('publish')
  let body = await c.req.json()
  fs.writeFileSync('/tmp/metadata.json', JSON.stringify(body, null, 2))

  const tx = await mintCamNFT(body)
  return c.json({ tx: tx.hash, success: true })
})

app.post('/upload', async (c) => {
  console.log('upload')
  // print the body
  let body = await c.req.json()
  // console.log("body", body)
  // TODO: validate body
  // upload iamge data to irys
//{  "sha256": "eb121b1a612363f83b78ac03d06e8bb0269c5ea2b3bddae68eb9f227743ce050",  "eth": {    "signature": "ccc2a0c163be0b6821379de4cde623fc7d03b2da3debb284027fd28d01e5b07c58c619510e975cbff041a209c3bffdbbc5480b151690537fc266725be4147c851c",    "pubkey": "0xDF1fa57240Ee6896F063abb0276cfe110fE34796"  },  "secp256r1": {    "pubkey": "BPHPmNPA8EViaYQ58MaWs2sy3VkWiyhU0HJKDmMDlzxhSkW+FG2uSGnm9R4nsDcZYeMy1V64zE5nFGnX8z3IXZg=",    "signature": "MEUCIGIt3PLlsr4aJKJ0r7QCOEcYvH4gbBzWNGT9TfPvi4ZEAiEAjY3WkdwC9p69m+VMh1UAyAsFEyERiLOySbuWBlisxZw="  },  "content": {    "type": "public",    "value": {      "metadata": {        "deviceInfo": "[\"model\": \"iPhone 13 Pro\", \"systemVersion\": \"18.1\", \"name\": \"iPhone\"]",        "timestamp": "2024-11-07T06:21:32Z",        "imageProperties": "[\"EXIF\": [\"SceneType\": 1, \"LensMake\": Apple, \"PixelYDimension\": 1080, \"DateTimeOriginal\": 2024:11:07 14:21:31, \"CustomRendered\": 1, \"FNumber\": 1.5, \"ApertureValue\": 1.169925002106682, \"PixelXDimension\": 1920, \"FocalLength\": 5.7, \"Flash\": 16, \"ExposureMode\": 0, \"FocalLenIn35mmFilm\": 27, \"SubjectArea\": <__NSArrayM 0x301139b90>(\n960,\n539,\n1056,\n475\n)\n, \"ExposureProgram\": 2, \"OffsetTime\": +08:00, \"ExifVersion\": <__NSArrayM 0x301138d50>(\n2,\n3,\n2\n)\n, \"ExposureBiasValue\": 0, \"ComponentsConfiguration\": <__NSArrayM 0x30113bbd0>(\n1,\n2,\n3,\n0\n)\n, \"FlashPixVersion\": <__NSArrayM 0x30113b1e0>(\n1,\n0\n)\n, \"ShutterSpeedValue\": 5.644000467344316, \"OffsetTimeDigitized\": +08:00, \"ISOSpeedRatings\": <__NSArrayM 0x30113a4c0>(\n400\n)\n, \"OffsetTimeOriginal\": +08:00, \"ExposureTime\": 0.02, \"SubsecTimeDigitized\": 862, \"BrightnessValue\": 0.397811839047445, \"WhiteBalance\": 0, \"LensSpecification\": <__NSArrayM 0x30113a040>(\n5.7,\n5.7,\n1.5,\n1.5\n)\n, \"LensModel\": iPhone 13 Pro back camera 5.7mm f/1.5, \"MeteringMode\": 5, \"SubsecTimeOriginal\": 862, \"SensingMethod\": 2, \"ColorSpace\": 1, \"SceneCaptureType\": 0, \"DateTimeDigitized\": 2024:11:07 14:21:31], \"Depth\": 8, \"PixelHeight\": 1080, \"TIFF\": [\"DateTime\": 2024:11:07 14:21:31, \"ResolutionUnit\": 2, \"XResolution\": 72, \"Model\": iPhone 13 Pro, \"YResolution\": 72, \"Make\": Apple, \"Orientation\": 6, \"Software\": 18.1, \"HostComputer\": iPhone 13 Pro], \"ColorModel\": RGB, \"PixelWidth\": 1920, \"DPIHeight\": 72, \"Orientation\": 6, \"DPIWidth\": 72]",        "sensorData": "[\"latitude\": 1.4857496469926452, \"timestamp\": 1730960492.1406, \"heading\": 19.428152084350586, \"decibels\": 47.209156, \"batteryLevel\": 55, \"motion\": [\"pitch\": 55.072353403177964, \"yaw\": -1.9673710735239849, \"gravity\": [\"z\": -0.5714854001998901, \"x\": -0.03475777059793472, \"y\": -0.8198757171630859], \"roll\": -3.480445249422036], \"deviceModel\": \"iPhone 13 Pro\", \"altitude\": 17.63135796146054, \"longitude\": 103.67958559668226]"      }    }  }}
  let metadataUrl = ""
  const raw = JSON.stringify(body)
  fs.writeFileSync('/tmp/raw.json', raw)

  // const rawResult = await Irys.irys.uploadData(raw, [{ name: "content-type", value: "application/json" }])


  if (body.content.type === "public") {
    fs.writeFileSync('/tmp/public.json', raw)
    const metadata = JSON.parse(body.content.value.metadata)
    const deviceInfo = metadata.deviceInfo
    const imageProperties = metadata.imageProperties
    const sensorData = metadata.sensorData
    const timestamp = metadata.timestamp
    let attributes = []
    function processObject(obj: { [x: string]: any }, prefix = '') {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const traitKey = prefix ? `${prefix}_${key}` : key;
            
            if (typeof value === 'object' && value !== null) {
                processObject(value, traitKey);
            } else {
                attributes.push({
                  display_type: typeof value === 'number' ? 'number' : 'string',
                  trait_type: traitKey,
                  value: value
                });
            }
        });
    }
    processObject(deviceInfo, "device");
    processObject(sensorData);
    processObject(imageProperties);
    attributes.push({
        trait_type: "timestamp",
        value: timestamp
    })
    

    console.log("uploading image")  
    const img = Buffer.from(body.content.value.mediadata, 'base64')
    const imgResult = await Irys.irys.uploadData(img, [{ name: "content-type", value: "image/png" }])

    console.log("uploading metadata")
    const metadataResult = await Irys.irys.uploadData(JSON.stringify({
      attributes,
      image: imgResult.url,
      proof: {
        secp256r1: body.secp256r1,
        eth: body.eth
      }
    }), [{ name: "content-type", value: "application/json" }])
    metadataUrl = metadataResult.url
    console.log("minting nft")
    // await mintCamNFT(body.eth.pubkey, metadataUrl)

  } else if (body.content.type === "private") {
    console.log('private')
    fs.writeFileSync('/tmp/private.json', JSON.stringify(body))

    const metadataResult = await Irys.irys.uploadData(JSON.stringify({
      encrypted: body.content.value.encrypted,
      proof: {
        secp256r1: body.secp256r1,
        eth: body.eth
      }
    }), [{ name: "content-type", value: "application/json" }])
    metadataUrl = metadataResult.url

  }
  // let irysId = await Irys.irys.uploadData(JSON.stringify(body))

  console.log({ url: metadataUrl, owner: body.eth.pubkey.toLowerCase() })
  return c.json({ url: metadataUrl, owner: body.eth.pubkey.toLowerCase() })

})

app.get('/access_nft', async (c) => {
  // const body = await c.req.json()
  const url = c.req.query('url')

  const proof = await fetch(url!).then(res => res.json())
  console.log("proof", proof)
  const { ethereum_address, key_id, challenge_data, lit_ciphertext, lit_hash, attestation_receipt, secp256r1_pubkey } = proof

  if (!attestation_receipt) {
    return c.json({ error: 'Missing key_id or attestation in the request body' }, 400)
  }
  const challenge_data_hash = crypto.createHash('sha256').update(`ethereum_address=${ethereum_address}&lit_ciphertext=${lit_ciphertext}&lit_hash=${lit_hash}&secp256r1_pubkey=${secp256r1_pubkey}`).digest('base64')
  // console.log("challenge_data_hash", challenge_data_hash)
  if (challenge_data_hash !== challenge_data) {
    return c.json({ error: 'Challenge data hash mismatch', details: challenge_data_hash, expected: challenge_data }, 400)
  }

  console.log("verifyAttestation", key_id, attestation_receipt, challenge_data)
  const valid = await verifyAttestation(key_id, attestation_receipt, async () => challenge_data)

  return c.json({ valid, owner: ethereum_address, attester: secp256r1_pubkey })
})


app.post('/access_nft', async (c) => {
  // console.log("access_nft")
  // const url = c.req.query('url')
  // console.log("url", url)
  const body = await c.req.json()
  fs.writeFileSync('/tmp/access_nft.json', JSON.stringify(body))

  const irysResult = await Irys.irys.uploadData(JSON.stringify(body), [
    { name: "content-type", value: "application/json" },
    { name: "owner", value: body.ethereum_address }
  ])
    .catch((e: any) => {
      console.log("Error uploading file to irys", e);
      return c.json({ error: 'Failed to upload file to irys' }, 500);
    })

  console.log("irysResult", irysResult)

  await Attester.attest(irysResult.url)
    .catch((e: any) => {
      console.log("Error attesting", e)
      return c.json({ error: 'Failed to attest' }, 500);
    })

  return c.json({ irys: irysResult })
})

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

Irys.initialize().then(() => console.log('irys initialized'))

serve({
  fetch: app.fetch,
  port
})
