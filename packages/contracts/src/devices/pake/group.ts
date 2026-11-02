import { ristretto255, ristretto255_hasher } from '@noble/curves/ed25519.js';
import { bytesToNumberLE } from '@noble/curves/utils.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';

const { Point } = ristretto255;

export type GroupElement = InstanceType<typeof ristretto255.Point>;

export type RandomBytes = (length: number) => Uint8Array;

export const elementBytes = 32;

export const sidBytes = 16;

const scalarSeedBytes = 64;

// Names this exchange so nothing derived here can mean anything in another protocol.
export const domain = utf8ToBytes('ArgoPairingCPace255');

const blockBytes = 128;

const prefixed = (bytes: Uint8Array): Uint8Array =>
  concatBytes(Uint8Array.of(bytes.length), bytes);

/*
 * The group element both sides raise to their secret, made from the code and this run's `sid` (the shape of CPace's generator, draft-irtf-cfrg-cpace, hashed onto ristretto255 with RFC 9380's SHA-512 map).
 * Nobody knows a discrete log of it, because it comes out of a hash of the code: a watcher cannot test a guessed code against a transcript without solving a Diffie-Hellman problem, and a fresh `sid` makes every run's element new.
 */
export function generator(code: string, sid: Uint8Array): GroupElement {
  const password = utf8ToBytes(code);
  const padding = blockBytes - 1 - (password.length + 1) - (domain.length + 1);

  const material = concatBytes(
    prefixed(domain),
    prefixed(password),
    prefixed(new Uint8Array(Math.max(0, padding))),
    prefixed(sid),
  );

  return ristretto255_hasher.hashToCurve(material, { DST: domain });
}

// A secret exponent, uniform enough that no bias is worth the name.
export const randomScalar = (random: RandomBytes): bigint =>
  bytesToNumberLE(random(scalarSeedBytes)) % Point.Fn.ORDER || 1n;

// Not every 32 bytes is an element, and the identity would make the shared secret the same for every code, so neither is accepted from a peer.
export function readElement(bytes: Uint8Array): GroupElement {
  const element = Point.fromBytes(bytes);

  if (element.is0()) throw new Error('A peer sent the identity element');

  return element;
}

// An element nobody has a use for, so a pad in a reply decodes as an element like the real entries do.
export const randomElement = (random: RandomBytes): Uint8Array =>
  Point.BASE.multiply(randomScalar(random)).toBytes();
