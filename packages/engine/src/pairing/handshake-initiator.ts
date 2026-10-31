import { ChannelCipher } from './channel-cipher';
import { tagBytes } from './cipher-state';
import { SymmetricState } from './symmetric-state';
import {
  generateKeypair,
  keyBytes,
  sharedSecret,
  type Keypair,
} from './x25519';

export interface InitiatorInput {
  // The Device's own long-term key; its public half is what the Server stores for this Device.
  readonly deviceKey: Keypair;
  // The Server's static public key, as the QR code carried it. A Server that does not hold the private half cannot read the first message, so an App that was given the wrong one gets no channel.
  readonly serverPublicKey: Buffer;
  readonly claim: Buffer;
}

export interface AcceptedChannel {
  readonly welcome: Buffer;
  readonly cipher: ChannelCipher;
}

export interface InitiatorHandshake {
  readonly message: Buffer;
  readonly accept: (message: Buffer) => AcceptedChannel;
}

// The App's side of the exchange: the first message to send, and what to do with the answer (ADR-0045).
export function startHandshake(input: InitiatorInput): InitiatorHandshake {
  const state = new SymmetricState(input.serverPublicKey);
  const ephemeral = generateKeypair();

  return {
    message: firstMessage(state, input, ephemeral),
    accept: (message): AcceptedChannel =>
      acceptSecondMessage({ state, input, ephemeral }, message),
  };
}

function firstMessage(
  state: SymmetricState,
  input: InitiatorInput,
  ephemeral: Keypair,
): Buffer {
  const deviceKey = sealedDeviceKey(state, input, ephemeral);

  return Buffer.concat([
    ephemeral.publicKey,
    deviceKey,
    state.encryptAndHash(input.claim),
  ]);
}

// The Device Key's public half, sealed to the Server alone: the `es` token first, so only a Server holding that static private key can read it, then `ss`, which is what proves the Device holds its own.
function sealedDeviceKey(
  state: SymmetricState,
  input: InitiatorInput,
  ephemeral: Keypair,
): Buffer {
  state.mixHash(ephemeral.publicKey);
  state.mixKey(sharedSecret(ephemeral.privateKey, input.serverPublicKey));

  const deviceKey = state.encryptAndHash(input.deviceKey.publicKey);

  state.mixKey(sharedSecret(input.deviceKey.privateKey, input.serverPublicKey));

  return deviceKey;
}

interface InitiatorState {
  readonly state: SymmetricState;
  readonly input: InitiatorInput;
  readonly ephemeral: Keypair;
}

function acceptSecondMessage(
  { state, input, ephemeral }: InitiatorState,
  message: Buffer,
): AcceptedChannel {
  if (message.length < keyBytes + tagBytes)
    throw new Error('The Server answered with too short a message');
  const serverEphemeral = message.subarray(0, keyBytes);

  state.mixHash(serverEphemeral);
  state.mixKey(sharedSecret(ephemeral.privateKey, serverEphemeral));
  state.mixKey(sharedSecret(input.deviceKey.privateKey, serverEphemeral));
  const welcome = state.decryptAndHash(message.subarray(keyBytes));
  const [sending, receiving] = state.split();

  return { welcome, cipher: new ChannelCipher(sending, receiving) };
}
