import { privateKeyToAccount } from "viem/accounts"

import {
    SignProtocolClient,
    SpMode,
    EvmChains,
    IndexService,
    decodeOnChainData,
    DataLocationOnChain,
    delegateSignAttestation
    // delegateSignAttestation,
    // delegateSignRevokeAttestation,
    // delegateSignSchema,
} from "@ethsign/sp-sdk";

import { generatePrivateKey } from "viem/accounts";

export const ADMIN = privateKeyToAccount(process.env.ADMIN as `0x${string}`)

// console.log(ADMIN.address)

export const SignClient = new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.baseSepolia,
    account: ADMIN, // Optional if you are using an injected provider
});