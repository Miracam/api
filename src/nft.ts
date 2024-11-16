import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN!, provider)

const minter = new ethers.Contract(process.env.MINTER_CONTRACT_ADDRESS!, [
  "function mint(uint r, uint s, bytes pubkey, address to, string url) public"
], wallet);

const nft = new ethers.Contract(process.env.NFT_CONTRACT_ADDRESS!, [
  "function tokenURI(uint256 tokenId) public view returns (string memory)"
], provider);

async function extract(pubkey: string, signature: string) {
  const pubKeyBuf = Buffer.from(pubkey, 'base64')
  const signatureBuffer = Buffer.from(signature, 'base64')

  const x = pubKeyBuf.subarray(1, 33)
  const y = pubKeyBuf.subarray(33)

  const [r, s] = derToRS(signatureBuffer)

  return { x, y, r, s }
}

function derToRS(der: Buffer) {
  let offset = 3;
  let dataOffset;

  if (der[offset] == 0x21) {
      dataOffset = offset + 2;
  }
  else {
      dataOffset = offset + 1;
  }
  const r = der.slice(dataOffset, dataOffset + 32);
  offset = offset + der[offset] + 1 + 1
  if (der[offset] == 0x21) {
      dataOffset = offset + 2;
  }
  else {
      dataOffset = offset + 1;
  }
  const s = der.slice(dataOffset, dataOffset + 32);
  return [r, s]
}

// const proof = {
//                 "message": "owner=0x485fa1883a8ad8b09d69522a7f79162fc3eb8e80&url=https://gateway.irys.xyz/CitxkaD3hLpTMaLkW1pagb1b6xPEtB6VvAjvfn6upyiZ",
//                 "owner": "0x485fa1883a8ad8b09d69522a7f79162fc3eb8e80",
//                 "secp256r1_pubkey": "BALNspjpyeYwX9vArRtgHOOltyOYYMDDOiw3G6xiyAzEBrGfr6RXQp32J18GmvA+FifRGLGohYVdlisxZrPHD74=",
//                 "signature": "MEUCIQCMEZ7cBKAbBwqpNJ2w1uX8TESccJmL3Dn8BDFw1L3jWQIgE+OpfU3qsTlUP2JqMDVFKwojWJouQ6kUjtQqGrxb94w=",
//                 "url": "https://gateway.irys.xyz/CitxkaD3hLpTMaLkW1pagb1b6xPEtB6VvAjvfn6upyiZ"
//             }

interface Proof {
  message: string
  owner: string
  secp256r1_pubkey: string
  signature: string
  url: string
}


async function mintCamNFT(proof: Proof) {
    
    const { r, s } = await extract(proof.secp256r1_pubkey, proof.signature)

    // const tx = await alpha.safeMint(toAddress, tokenURI);
    // const receipt = await tx.wait();
    
    // console.log(`NFT minted successfully! Transaction hash: ${receipt.hash}`);
    // // Parse the logs using abi to find the Transfer event and extract tokenId
    // const parsedLog = alpha.interface.parseLog(receipt.logs[0])
    // const tokenId = parsedLog?.args.tokenId;
    // console.log(`Minted token ID: ${tokenId}`);
    const extracted = {
      r: "0x" + r.toString('hex'),
      s: "0x" + s.toString('hex'),
      pubkey: Buffer.from(proof.secp256r1_pubkey, 'base64')
  }

  const tx = await minter.mint(extracted.r, extracted.s, extracted.pubkey, proof.owner, proof.url);
  await tx.wait(1)
  // console.log(tx)
  return tx
  // return { hash: receipt.hash, tokenId: Number(tokenId) };
}

async function tokenUrl(id: number) {
  return await nft.tokenURI(id)
  // return `https://gateway.irys.xyz/${id}`
}


export { mintCamNFT, tokenUrl };