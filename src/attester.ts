import "dotenv/config"
import { ethers } from "ethersv5";
import AttesterABI from "./attester.abi.json"
import {
  decodeResult,
  ResponseListener,
  FulfillmentCode,
  ReturnType
} from "@chainlink/functions-toolkit"


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


const provider = new ethers.providers.JsonRpcProvider(network.url);

const wallet = new ethers.Wallet(process.env.ADMIN!, provider)

const responseListener = new ResponseListener({
  provider,
  functionsRouterAddress: network.functionsRouter,
})


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

  try {
    // Get response data
    const { requestId, totalCostInJuels, responseBytesHexstring, errorString, fulfillmentCode } =
      await responseListener.listenForResponseFromTransaction(requestTx.hash, undefined, undefined, undefined)

    switch (fulfillmentCode) {
      case FulfillmentCode.FULFILLED:
        if (responseBytesHexstring !== "0x") {
          console.log(
            `Request ${requestId} fulfilled!\nResponse has been sent to consumer contract: ${decodeResult(
              responseBytesHexstring,
              ReturnType.bytes,
            ).toString()}\n`
          )
        } else if (errorString.length > 0) {
          console.warn(`Request ${requestId} fulfilled with error: ${errorString}\n`)
        } else {
          console.log(`Request ${requestId} fulfilled with empty response data.\n`)
        }
        const linkCost = ethers.utils.formatUnits(totalCostInJuels, 18)
        console.log(`Total request cost: ${linkCost + " LINK"}`)
        break

      case FulfillmentCode.USER_CALLBACK_ERROR:
        console.warn(
          "Error encountered when calling consumer contract callback.\nEnsure the fulfillRequest function in FunctionsConsumer is correct and the --callbackgaslimit is sufficient."
        )
        break

      case FulfillmentCode.COST_EXCEEDS_COMMITMENT:
        console.warn(`Request ${requestId} failed due to a gas price spike when attempting to respond.`)
        break

      default:
        console.warn(
          `Request ${requestId} failed with fulfillment code: ${fulfillmentCode}. Please contact Chainlink support.`
        )
    }
  } catch (error) {
    console.warn("Request fulfillment was not received within 5 minute response period.")
    throw error
  } 

  return requestTxReceipt
}


export { attest };