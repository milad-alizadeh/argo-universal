import { concatBytes } from './bytes';
import { ChannelCipher } from './channel-cipher';
import { tagBytes } from './cipher-state';
import { SymmetricState } from './symmetric-state';
import {
  keyBytes,
  keypairFromPrivateKey,
  sharedSecret,
  type Keypair,
} from './x25519';

export interface InitiatorInput {
  // The Device's own long-term key; its public half is what the Server stores for this Device.
  readonly deviceKey: Keypair;
  // The Server's static public key as the QR code carried it. A Server without the private half cannot read the first message.
  readonly serverPublicKey: Uint8Array;
  readonly claim: Uint8Array;
  // Where a fresh ephemeral key's 32 bytes come from. A React Native App has no `crypto` global to take them from.
  readonly randomBytes: (length: number) => Uint8Array;
}

// What an exchange would otherwise decide for itself; only the published-vector test passes it, since an ephemeral key used twice is not ephemeral.
export interface HandshakeVector {
  readonly ephemeral: Keypair;
  readonly prologue: Uint8Array;
}

export interface AcceptedChannel {
  readonly welcome: Uint8Array;
  readonly cipher: ChannelCipher;
}

export interface InitiatorHandshake {
  readonly message: Uint8Array;
  readonly accept: (message: Uint8Array) => AcceptedChannel;
}

const ephemeralOf = (
  input: InitiatorInput,
  vector: HandshakeVector | undefined,
): Keypair =>
  vector
    ? vector.ephemeral
    : keypairFromPrivateKey(input.randomBytes(keyBytes));

// The App's side of the exchange: the first message to send, and what to do with the answer (ADR-0045).
export function startHandshake(
  input: InitiatorInput,
  vector?: HandshakeVector,
): InitiatorHandshake {
  const exchange = new Exchange(input, ephemeralOf(input, vector), vector);

  return {
    message: exchange.opening(),
    accept: (answer): AcceptedChannel => exchange.finish(answer),
  };
}

class Exchange {
  private readonly noise: SymmetricState;

  public constructor(
    private readonly input: InitiatorInput,
    private readonly ephemeral: Keypair,
    vector: HandshakeVector | undefined,
  ) {
    this.noise = new SymmetricState(input.serverPublicKey, vector?.prologue);
  }

  // `e`, then the Device Key sealed to the Server alone: `es` first, so only the holder of that static private key can read it, then `ss`, which proves this Device holds its own.
  public opening(): Uint8Array {
    const { noise, ephemeral, input } = this;
    const toServer = input.serverPublicKey;

    noise.mixHash(ephemeral.publicKey);
    noise.mixKey(sharedSecret(ephemeral.privateKey, toServer));
    const sealedKey = noise.encryptAndHash(input.deviceKey.publicKey);

    noise.mixKey(sharedSecret(input.deviceKey.privateKey, toServer));

    return concatBytes(
      ephemeral.publicKey,
      sealedKey,
      noise.encryptAndHash(input.claim),
    );
  }

  // The Server's `e`, then `ee` and `se`; what it sealed under them is the welcome.
  public finish(answer: Uint8Array): AcceptedChannel {
    if (answer.length < keyBytes + tagBytes)
      throw new Error('The Server answered with too short a message');
    const theirs = answer.subarray(0, keyBytes);

    this.noise.mixHash(theirs);
    this.noise.mixKey(sharedSecret(this.ephemeral.privateKey, theirs));
    this.noise.mixKey(sharedSecret(this.input.deviceKey.privateKey, theirs));
    const [sending, receiving] = this.noise.split();

    return {
      welcome: this.noise.decryptAndHash(answer.subarray(keyBytes)),
      cipher: new ChannelCipher(sending, receiving),
    };
  }
}
