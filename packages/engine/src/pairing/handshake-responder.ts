import { ChannelCipher } from './channel-cipher';
import { tagBytes } from './cipher-state';
import { SymmetricState } from './symmetric-state';
import {
  generateKeypair,
  keyBytes,
  sharedSecret,
  type Keypair,
} from './x25519';

const deviceKeyRecordBytes = keyBytes + tagBytes;

export const smallestFirstMessage = keyBytes + deviceKeyRecordBytes + tagBytes;

export interface AnsweredChannel {
  readonly message: Buffer;
  readonly cipher: ChannelCipher;
}

export interface ReceivedHandshake {
  // The public half of the connecting Device's own key, which it proved it holds the private half of.
  readonly deviceKey: Buffer;
  // The Device's ephemeral public key, fresh for this exchange and never seen in another one.
  readonly ephemeral: Buffer;
  readonly claim: Buffer;
  readonly answer: (welcome: Buffer) => AnsweredChannel;
}

/*
 * The Server's side of the exchange. Reading the first message at all takes the Server's static private key, so a computer on the network that answers to the right name with the wrong key gets nowhere.
 * Answering authenticates the Server to the App and the Device Key to the Server; whether that Device may reach anything is a separate question the welcome carries.
 */
export function receiveHandshake(
  staticKey: Keypair,
  message: Buffer,
): ReceivedHandshake {
  if (message.length < smallestFirstMessage)
    throw new Error('A Device opened with too short a message');

  const state = new SymmetricState(staticKey.publicKey);
  const ephemeral = message.subarray(0, keyBytes);
  const deviceKey = readDeviceKey({ state, staticKey, ephemeral }, message);

  return received({ state, ephemeral, deviceKey }, message);
}

const received = (
  answering: AnsweringState,
  message: Buffer,
): ReceivedHandshake => ({
  deviceKey: answering.deviceKey,
  ephemeral: answering.ephemeral,
  claim: answering.state.decryptAndHash(
    message.subarray(keyBytes + deviceKeyRecordBytes),
  ),
  answer: (welcome): AnsweredChannel => answerWith(answering, welcome),
});

interface ReadingState {
  readonly state: SymmetricState;
  readonly staticKey: Keypair;
  readonly ephemeral: Buffer;
}

function readDeviceKey(
  { state, staticKey, ephemeral }: ReadingState,
  message: Buffer,
): Buffer {
  state.mixHash(ephemeral);
  state.mixKey(sharedSecret(staticKey.privateKey, ephemeral));

  const deviceKey = state.decryptAndHash(
    message.subarray(keyBytes, keyBytes + deviceKeyRecordBytes),
  );

  state.mixKey(sharedSecret(staticKey.privateKey, deviceKey));

  return deviceKey;
}

interface AnsweringState {
  readonly state: SymmetricState;
  // The Device's ephemeral public key, which the Server's own fresh ephemeral is mixed against.
  readonly ephemeral: Buffer;
  readonly deviceKey: Buffer;
}

function answerWith(
  { state, ephemeral, deviceKey }: AnsweringState,
  welcome: Buffer,
): AnsweredChannel {
  const own = generateKeypair();

  state.mixHash(own.publicKey);
  state.mixKey(sharedSecret(own.privateKey, ephemeral));
  state.mixKey(sharedSecret(own.privateKey, deviceKey));

  const message = Buffer.concat([own.publicKey, state.encryptAndHash(welcome)]);
  const [receiving, sending] = state.split();

  return { message, cipher: new ChannelCipher(sending, receiving) };
}
