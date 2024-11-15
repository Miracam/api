import { privateKeyToAccount } from "viem/accounts"

export const ADMIN = privateKeyToAccount(process.env.ADMIN as `0x${string}`)

console.log(ADMIN.address)