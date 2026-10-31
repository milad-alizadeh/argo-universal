import { generateKeypair, type Keypair } from './x25519';

/*
 * What an exchange would otherwise decide for itself: the ephemeral keypair it generates, and the prologue it mixes in before anything else.
 * It exists for one reason. A published Noise test vector fixes both sides' ephemeral keys and its own prologue, and an implementation that insists on generating its own can never be checked against one -- so a byte-order or concatenation mistake made the same way on both sides passes every test written against this code alone.
 * Only `handshake-vectors.test.ts` passes it. Nothing that runs on a real Connection may, because an ephemeral key used twice is not ephemeral.
 */
export interface HandshakeVector {
  readonly ephemeral: Keypair;
  readonly prologue: Buffer;
}

// A fresh ephemeral keypair for this one exchange, unless a vector has fixed which one to use.
export const ephemeralOf = (vector: HandshakeVector | undefined): Keypair =>
  vector?.ephemeral ?? generateKeypair();
