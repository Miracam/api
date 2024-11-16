import * as crypto from 'crypto';
import * as x509 from '@peculiar/x509';
import cbor from 'cbor';
import { Buffer } from 'buffer';


// Constants
// const APP_ID = '4RKXM42395.junyaoc.Toy-Cam';
const APP_ID = '4RKXM42395.junyaoc.Miracam';
const DEV_MODE = true;

// Helper functions
function getRPIdHash(authData) {
  return authData.subarray(0, 32);
}

function getSignCount(authData) {
  return authData.readInt32BE(33);
}

async function verifyAppAttestCertificateChain(certificates) {
  if (certificates.length !== 2) {
    throw new Error('Expected 2 certificates in x5c array');
  }

  const [leafCertBuffer, intermediateCertBuffer] = certificates;

  const leafCert = new x509.X509Certificate(leafCertBuffer);
  const intermediateCert = new x509.X509Certificate(intermediateCertBuffer);

  const response = await fetch('https://www.apple.com/certificateauthority/Apple_App_Attestation_Root_CA.pem');
  const appleRootCert = await response.text();
  const rootCert = new x509.X509Certificate(appleRootCert);

  const chain = [leafCert, intermediateCert, rootCert];
  for (let i = 0; i < chain.length - 1; i++) {
    const cert = chain[i];
    const issuer = chain[i + 1];

    if (cert.issuer.toString() !== issuer.subject.toString()) {
      throw new Error(`Certificate at index ${i} was not issued by the next certificate in the chain`);
    }

    const verified = await cert.verify({
      publicKey: await issuer.publicKey.export(),
      crypto: crypto
    });

    if (!verified) {
      throw new Error(`Failed to verify certificate at index ${i}`);
    }
  }

  const oidAppAttest = '1.2.840.113635.100.8.2';
  const appAttestExtension = leafCert.extensions.find(ext => ext.type === oidAppAttest);
  if (!appAttestExtension) {
    throw new Error('Leaf certificate does not contain the App Attest extension');
  }

  let extAsnString = appAttestExtension.toString('asn');
  let credCertPublicKey = leafCert.publicKey.rawData.slice(-65);
  let credCertPublicKeyHex = Buffer.from(credCertPublicKey).toString('hex');
  let expectedKeyId = crypto.createHash('sha256').update(Buffer.from(credCertPublicKeyHex, 'hex')).digest().toString('base64');

  const expectedIntermediateSubject = 'CN=Apple App Attestation CA 1, O=Apple Inc., ST=California';
  if (intermediateCert.subject.toString() !== expectedIntermediateSubject) {
    throw new Error('Intermediate certificate is not the expected Apple App Attestation CA');
  }

  return { chainValid: true, extAsnString, expectedKeyId };
}

export async function verifyAttestation(keyId, attestation, retrieveNonce) {
  const attestationObject = Buffer.from(attestation, 'base64');
  const attestationObjectJSON = cbor.decode(attestationObject);

//   console.log(attestationObjectJSON)

  if (attestationObjectJSON.fmt !== 'apple-appattest') {
    throw new Error('Unsupported attestation format');
  }

  const { chainValid, extAsnString, expectedKeyId } = await verifyAppAttestCertificateChain(attestationObjectJSON.attStmt.x5c);

  let authData = attestationObjectJSON.authData;

  // Retrieve the stored nonce
  const nonce = await retrieveNonce(keyId);
  // const nonceHash = crypto.createHash('sha256').update(Buffer.from(nonce, 'utf-8')).digest();
  const clientDataHash = Buffer.concat([authData, Buffer.from(nonce, 'base64')]);
  const clientDataHashSha256 = crypto.createHash('sha256').update(clientDataHash).digest('hex');

  let clientDataValid = extAsnString.endsWith(clientDataHashSha256);
  let keyIdValid = keyId === expectedKeyId;

  let appIdHash = crypto.createHash('sha256').update(Buffer.from(APP_ID, 'utf-8')).digest().toString('hex');
  let rpIdHash = getRPIdHash(authData);
  let rpIdHashHex = rpIdHash.toString('hex');
  let isRPIdHashValid = rpIdHashHex === appIdHash;

  const signCount = getSignCount(authData);
  let isSignCountValid = signCount === 0;

  const endIndex = DEV_MODE ? 53 : 46;
  const aaGuid = authData.subarray(37, endIndex).toString();
  const expectedGuid = DEV_MODE ? 'appattestdevelop' : 'appattest';
  let isAAGuidValid = aaGuid === expectedGuid;

  const credIdLen = authData.subarray(53, 55);
  if (credIdLen[0] !== 0 || credIdLen[1] !== 32) {
    throw new Error('Invalid credId length');
  }

  const credId = authData.subarray(55, 87);
  let isCredIdValid = credId.toString('base64') === keyId;

  console.log(116, {
    // success: true,
    chainValid,
    clientDataValid,
    keyIdValid,
    isRPIdHashValid,
    isSignCountValid,
    isAAGuidValid,
    isCredIdValid,
  })

  return chainValid && clientDataValid && keyIdValid && isRPIdHashValid && isSignCountValid && isAAGuidValid && isCredIdValid
  // return {
  //   // success: true,
  //   chainValid,
  //   clientDataValid,
  //   keyIdValid,
  //   isRPIdHashValid,
  //   isSignCountValid,
  //   isAAGuidValid,
  //   isCredIdValid,
  // };
}

// const attestdata = require('./attestdata.json')
//  verifyAttestation(attestdata.key_id, attestdata.attestation_receipt, () => attestdata.challenge_data).then(console.log)
