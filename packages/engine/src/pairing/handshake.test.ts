import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { startHandshake, type InitiatorHandshake } from './handshake-initiator';
import {
  receiveHandshake,
  type ReceivedHandshake,
} from './handshake-responder';
import { generateKeypair, storedPublicKey, type Keypair } from './x25519';

const claim = Buffer.from('iPhone 15 Pro');

const welcome = Buffer.from('paired');

// What node:crypto says when a record does not open with the key the other side used.
const unauthenticated = /unable to authenticate data/;

type Exchange = {
  deviceKey: Keypair;
  initiator: InitiatorHandshake;
  received: ReceivedHandshake;
};

function exchange(
  serverKey = generateKeypair(),
  expected = serverKey,
): Exchange {
  const deviceKey = generateKeypair();

  const initiator = startHandshake({
    deviceKey,
    serverPublicKey: expected.publicKey,
    claim,
  });

  return {
    deviceKey,
    initiator,
    received: receiveHandshake(serverKey, initiator.message),
  };
}

it('tells the Server which Device Key connected and what it claims to be', (): void => {
  const { deviceKey, received } = exchange();

  expect(storedPublicKey(received.deviceKey)).toBe(
    storedPublicKey(deviceKey.publicKey),
  );
  expect(received.claim.toString()).toBe('iPhone 15 Pro');
});

it('leaves the Device Key and the claim unreadable on the wire', (): void => {
  const { deviceKey, initiator } = exchange();

  expect(initiator.message.includes(deviceKey.publicKey)).toBe(false);
  expect(initiator.message.includes(claim)).toBe(false);
});

it('carries records both ways once both sides have answered', (): void => {
  const { initiator, received } = exchange();
  const answered = received.answer(welcome);
  const accepted = initiator.accept(answered.message);

  expect(accepted.welcome.toString()).toBe('paired');
  expect(
    answered.cipher.open(accepted.cipher.seal(Buffer.from('up'))).toString(),
  ).toBe('up');
  expect(
    accepted.cipher.open(answered.cipher.seal(Buffer.from('down'))).toString(),
  ).toBe('down');
});

it('refuses a record that is repeated into the channel', (): void => {
  const { initiator, received } = exchange();

  const answered = received.answer(welcome);

  const record = initiator
    .accept(answered.message)
    .cipher.seal(Buffer.from('once'));

  expect(answered.cipher.open(record).toString()).toBe('once');
  expect((): Buffer => answered.cipher.open(record)).toThrow(unauthenticated);
});

it('cannot be read by a Server that does not hold the static key the App was given', (): void => {
  expect((): Exchange =>
    exchange(generateKeypair(), generateKeypair()),
  ).toThrow(unauthenticated);
});

it('aborts instead of connecting when the answer is not from that Server', (): void => {
  const { initiator, received } = exchange();
  received.answer(welcome);

  expect((): void => void initiator.accept(randomBytes(48))).toThrow(
    unauthenticated,
  );
});
