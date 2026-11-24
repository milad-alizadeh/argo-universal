import { readFileSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { noiseIkVector } from '@repo/engine/pairing-vector';
import { expect, it } from 'vitest';
import { bytesHex, hexBytes, textBytes } from './bytes';
import { ChannelCipher } from './channel-cipher';
import { CipherState } from './cipher-state';
import { frameRecord } from './frames';
import { startHandshake } from './noise-initiator';
import { acceptFor } from './ws-upgrade';
import { keypairFromPrivateKey } from './x25519';

// The Swift and Kotlin record paths are tested against this file; it is regenerated here, so what they are tested against is what the Server's cipher makes.
const fixturePath = new URL(
  '../../../../../../../apps/universal-app/modules/argo-channel/fixtures/channel-vectors.json',
  import.meta.url,
);

const [opening, answering] = noiseIkVector.handshake;

const [clientRecord, serverRecord] = noiseIkVector.records;

const upgradeKey = 'dGhlIHNhbXBsZSBub25jZQ==';

const upgradeAnswer = (accept: string): string =>
  [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    '',
  ].join('\r\n');

// An unmasked server frame.
function serverFrame(
  opcode: number,
  payload: Uint8Array,
  fin = true,
): Uint8Array {
  return Uint8Array.of((fin ? 0x80 : 0) | opcode, payload.length, ...payload);
}

// An unmasked server text frame whose length needs two bytes.
function longServerFrame(payload: Uint8Array): Uint8Array {
  return Uint8Array.of(
    0x81,
    126,
    payload.length >> 8,
    payload.length & 0xff,
    ...payload,
  );
}

// With compression agreed, every record opens with a byte: 0 for the bytes as they are, 1 for raw deflate (ADR-0045).
const behind = (lead: number, bytes: Uint8Array): Uint8Array =>
  Uint8Array.of(lead, ...bytes);

function flippedLast(bytes: Uint8Array): Uint8Array {
  const flipped = Uint8Array.from(bytes);

  flipped[flipped.length - 1] = (flipped.at(-1) ?? 0) ^ 1;

  return flipped;
}

interface Fixture {
  readonly sendKey: string;
  readonly receiveKey: string;
  readonly vector: Record<string, string>;
  readonly accept: string;
  readonly upgradeThenFragmentedMessage: string[];
  readonly message: string;
  readonly upgradeThenPing: string[];
  readonly badAcceptUpgrade: string;
  readonly tamperedRecord: string;
  readonly compressedMessage: string;
  readonly upgradeThenCompressedMessage: string[];
  readonly upgradeThenStoredMessage: string[];
  readonly upgradeThenOversizedRecord: string[];
  readonly upgradeThenUnknownLeadingByte: string[];
}

function generated(): Fixture {
  const accepted = startHandshake(
    {
      deviceKey: keypairFromPrivateKey(hexBytes(noiseIkVector.initiatorStatic)),
      serverPublicKey: hexBytes(noiseIkVector.responderPublicKey),
      claim: textBytes(opening.payload),
      randomBytes: () => {
        throw new Error('A vector fixes the ephemeral key');
      },
    },
    {
      ephemeral: keypairFromPrivateKey(
        hexBytes(noiseIkVector.initiatorEphemeral),
      ),
      prologue: textBytes(noiseIkVector.prologue),
    },
  ).accept(hexBytes(answering.message));

  // The App has sealed the vector's first record and opened the Server's, so each direction stands at record 1.
  accepted.cipher.seal(textBytes(clientRecord.payload));
  accepted.cipher.open(hexBytes(serverRecord.message));
  const { sending, receiving } = accepted.cipher.position();

  // The Server's side of the same channel, from record 1 on: each scenario starts from record 1 on a cipher of its own.
  const serverCipher = (): ChannelCipher =>
    new ChannelCipher(
      new CipherState(receiving.key, 1),
      new CipherState(sending.key, 1),
    );

  const text = textBytes('{"hello":"wörld"}');
  const half = Math.floor(text.length / 2);

  const scenario = (answer: string, ...frames: Uint8Array[]): string[] => {
    const server = serverCipher();

    return [textBytes(answer), ...frames].map((bytes) =>
      bytesHex(frameRecord(server.seal(bytes))),
    );
  };

  const goodAnswer = upgradeAnswer(acceptFor(upgradeKey));

  const compressedScenario = (...records: Uint8Array[]): string[] => {
    const server = serverCipher();

    return [behind(0, textBytes(goodAnswer)), ...records].map((bytes) =>
      bytesHex(frameRecord(server.seal(bytes))),
    );
  };

  const large = JSON.stringify({
    rows: Array.from({ length: 80 }, (_, id) => ({
      id,
      text: 'The quick brown fox jumps over the lazy dog',
    })),
  });

  const largeFrame = longServerFrame(textBytes(large));
  const stored = serverFrame(1, text);

  return {
    sendKey: bytesHex(sending.key),
    receiveKey: bytesHex(receiving.key),
    // The published vector's records, at record 0 of each direction.
    vector: {
      clientPayload: clientRecord.payload,
      clientRecord: clientRecord.message,
      serverPayload: serverRecord.payload,
      serverRecord: serverRecord.message,
    },
    accept: acceptFor(upgradeKey),
    // Framed records the Server sends from record 1: the upgrade answer, then a message cut over two records, or a ping.
    upgradeThenFragmentedMessage: scenario(
      goodAnswer,
      serverFrame(1, text.subarray(0, half), false),
      serverFrame(0, text.subarray(half)),
    ),
    message: '{"hello":"wörld"}',
    upgradeThenPing: scenario(goodAnswer, serverFrame(9, Uint8Array.of(7))),
    badAcceptUpgrade: scenario(upgradeAnswer('not-the-accept')).join(''),
    tamperedRecord: bytesHex(
      flippedLast(hexBytes(scenario(goodAnswer)[0] ?? '')),
    ),
    // A large message that the Server deflated, behind a 1; a small one it sent as it is, behind a 0.
    compressedMessage: large,
    upgradeThenCompressedMessage: compressedScenario(
      behind(1, deflateRawSync(largeFrame)),
    ),
    upgradeThenStoredMessage: compressedScenario(behind(0, stored)),
    // A record that inflates past what one record holds, and one that leads with a byte that means nothing.
    upgradeThenOversizedRecord: compressedScenario(
      behind(1, deflateRawSync(new Uint8Array(1_000_000))),
    ),
    upgradeThenUnknownLeadingByte: compressedScenario(behind(2, stored)),
  };
}

it('keeps the native test fixture equal to what the Server cipher makes', () => {
  const wanted = `${JSON.stringify(generated(), undefined, 2)}\n`;

  if (process.env['UPDATE_NATIVE_FIXTURE']) writeFileSync(fixturePath, wanted);
  expect(readFileSync(fixturePath, 'utf8')).toBe(wanted);
});
