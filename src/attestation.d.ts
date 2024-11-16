declare module './attestation.js' {
    export function verifyAttestation(keyId: string, attestation: any, getNonce: () => Promise<string>): Promise<any>;
}
