import "dotenv/config"
import { ethers } from "ethers";
import AttesterABI from "./attester.abi.json"
// import {
//   decodeResult,
//   ResponseListener,
//   FulfillmentCode,
// } from "@chainlink/functions-toolkit"
const network = {
  url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", // https://docs.basescan.org/v/sepolia-basescan/
  gasPrice: undefined,
  nonce: undefined,
  verifyApiKey: process.env.BASESCAN_API_KEY || "UNSET",
  chainId: 84532,
  nativeCurrencySymbol: "ETH",
  linkToken: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
  linkPriceFeed: "0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69", // https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1
  functionsRouter: "0xf9B8fc078197181C841c296C876945aaa425B278",
  donId: "fun-base-sepolia-1",
  gatewayUrls: [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ],
}

const provider = new ethers.JsonRpcProvider(network.url);

const wallet = new ethers.Wallet(process.env.ADMIN!, provider)

const AccessAttesterContract = new ethers.Contract(process.env.ATTESTER_CONTRACT_ADDRESS!, AttesterABI, wallet);

async function attest(url: string) {
  const args = {
    args: [
      url
    ],
    subscriptionId: 231,
    callbackGasLimit: 300000,
    overrides: { gasLimit: 5750000 }
  }
  const requestTx = await AccessAttesterContract.sendRequest(
    args.args,
    args.subscriptionId,
    args.callbackGasLimit,
    args.overrides
  )
  const requestTxReceipt = await requestTx.wait(1)
  console.log("requestTxReceipt", requestTxReceipt)
  return requestTxReceipt
}


export { attest };