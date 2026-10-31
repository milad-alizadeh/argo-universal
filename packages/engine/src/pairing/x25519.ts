import {
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';

// The DER wrapper Node puts around a bare X25519 public key; the 32 raw bytes follow it.
const spkiPrefix = Buffer.from('302a300506032b656e032100', 'hex');

// The PKCS#8 wrapper Node puts around a bare X25519 private key; the 32 raw bytes follow it.
const pkcs8Prefix = Buffer.from('302e020100300506032b656e04220420', 'hex');

export const keyBytes = 32;

// A keypair as the handshake uses it: the private half as a key Node will do Diffie-Hellman with, the public half as the 32 bytes that go on the wire.
export interface Keypair {
  readonly privateKey: KeyObject;
  readonly publicKey: Buffer;
}

export const rawPublicKey = (key: KeyObject): Buffer =>
  Buffer.from(key.export({ type: 'spki', format: 'der' })).subarray(
    spkiPrefix.length,
  );

export function generateKeypair(): Keypair {
  const { privateKey, publicKey } = generateKeyPairSync('x25519');

  return { privateKey, publicKey: rawPublicKey(publicKey) };
}

export function keypairFromPem(pem: string | Buffer): Keypair {
  return keypairFrom(createPrivateKey(pem));
}

// A keypair from the 32 private bytes alone, which is how a published Noise test vector states one.
export const keypairFromPrivateKey = (raw: Buffer): Keypair =>
  keypairFrom(
    createPrivateKey({
      key: Buffer.concat([pkcs8Prefix, raw]),
      format: 'der',
      type: 'pkcs8',
    }),
  );

const keypairFrom = (privateKey: KeyObject): Keypair => ({
  privateKey,
  publicKey: rawPublicKey(createPublicKey(privateKey)),
});

// Both halves of a Diffie-Hellman: this Device's private key against the 32 bytes the peer sent.
export const sharedSecret = (
  privateKey: KeyObject,
  peerPublicKey: Buffer,
): Buffer =>
  diffieHellman({ privateKey, publicKey: publicKeyFrom(peerPublicKey) });

// What the Device table and the QR code hold: the same base64url SPKI the Server's static key has been written as since #1492.
export const storedPublicKey = (raw: Buffer): string =>
  Buffer.concat([spkiPrefix, raw]).toString('base64url');

export function rawFromStoredPublicKey(stored: string): Buffer {
  const der = Buffer.from(stored, 'base64url');

  if (der.length !== spkiPrefix.length + keyBytes)
    throw new Error('A public key of the wrong length cannot be a Device Key');

  return der.subarray(spkiPrefix.length);
}

const publicKeyFrom = (raw: Buffer): KeyObject =>
  createPublicKey({
    key: Buffer.concat([spkiPrefix, raw]),
    format: 'der',
    type: 'spki',
  });
