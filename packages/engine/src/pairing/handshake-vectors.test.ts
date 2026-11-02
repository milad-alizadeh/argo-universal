import { expect, it } from 'vitest';
import type { ChannelCipher } from './channel-cipher';
import { startHandshake } from './handshake-initiator';
import { receiveHandshake } from './handshake-responder';
import type { HandshakeVector } from './handshake-vector';
import { noiseIkVector } from './noise-vector-fixtures';
import { keypairFromPrivateKey } from './x25519';

const bytes = (hex: string): Buffer => Buffer.from(hex, 'hex');

const fixed = (privateKey: string): HandshakeVector => ({
  ephemeral: keypairFromPrivateKey(bytes(privateKey)),
  prologue: Buffer.from(noiseIkVector.prologue),
});

const [opening, answering] = noiseIkVector.handshake;

interface Replayed {
  readonly messages: readonly string[];
  readonly deviceKey: string;
  readonly claim: string;
  readonly welcome: string;
  readonly initiator: ChannelCipher;
  readonly responder: ChannelCipher;
}

/*
 * The whole vector exchange, driven by the shipped initiator and responder with the vector's own keys and prologue.
 * Nothing here is generated: if either side disagrees with the published bytes by one, every expectation below says so.
 */
function replayVector(): Replayed {
  const deviceKey = keypairFromPrivateKey(bytes(noiseIkVector.initiatorStatic));
  const staticKey = keypairFromPrivateKey(bytes(noiseIkVector.responderStatic));

  const initiator = startHandshake(
    {
      deviceKey,
      serverPublicKey: staticKey.publicKey,
      claim: Buffer.from(opening.payload),
    },
    fixed(noiseIkVector.initiatorEphemeral),
  );

  const received = receiveHandshake(
    staticKey,
    initiator.message,
    fixed(noiseIkVector.responderEphemeral),
  );

  return replied({ initiator, received, deviceKey: deviceKey.publicKey });
}

interface Halves {
  readonly initiator: ReturnType<typeof startHandshake>;
  readonly received: ReturnType<typeof receiveHandshake>;
  readonly deviceKey: Buffer;
}

function replied({ initiator, received, deviceKey }: Halves): Replayed {
  const answered = received.answer(Buffer.from(answering.payload));
  const accepted = initiator.accept(answered.message);

  return {
    messages: [initiator.message, answered.message].map(asHex),
    deviceKey: deviceKey.toString('hex'),
    claim: received.claim.toString(),
    welcome: accepted.welcome.toString(),
    initiator: accepted.cipher,
    responder: answered.cipher,
  };
}

const asHex = (message: Buffer): string => message.toString('hex');

it('sends and answers the two messages the published vector states, byte for byte', (): void => {
  const replayed = replayVector();

  expect(replayed.messages).toEqual([opening.message, answering.message]);
});

it('reads the Device Key and both payloads out of the vector exchange', (): void => {
  const replayed = replayVector();

  expect(replayed).toMatchObject({
    deviceKey: keypairFromPrivateKey(
      bytes(noiseIkVector.initiatorStatic),
    ).publicKey.toString('hex'),
    claim: opening.payload,
    welcome: answering.payload,
  });
});

it('takes the responder static key the vector says an initiator must already hold', (): void => {
  const staticKey = keypairFromPrivateKey(bytes(noiseIkVector.responderStatic));

  expect(asHex(staticKey.publicKey)).toBe(noiseIkVector.responderPublicKey);
});

it('seals and opens the first records of the finished channel as the vector states them', (): void => {
  const { initiator, responder } = replayVector();
  const [first, second] = noiseIkVector.records;

  expect(asHex(initiator.seal(Buffer.from(first.payload)))).toBe(first.message);
  expect(responder.open(bytes(first.message)).toString()).toBe(first.payload);
  expect(asHex(responder.seal(Buffer.from(second.payload)))).toBe(
    second.message,
  );
  expect(initiator.open(bytes(second.message)).toString()).toBe(second.payload);
});
