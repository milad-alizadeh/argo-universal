import type { PairingAnswer } from '@repo/contracts';
import type { ChannelCarrier } from './channel-carrier';
import { frameRecord } from './frames';
import type { ReceivedHandshake } from './handshake-responder';

type Answered = ReturnType<ReceivedHandshake['answer']>;

const asked: PairingAnswer = { asked: true };

const bytesOf = (answer: PairingAnswer): Buffer =>
  Buffer.from(JSON.stringify(answer));

/*
 * The Server's answer to one Device. A Device that has spent a live Ticket is told at once that its request is with the owner, as the handshake's answer, and the welcome follows as the first record the channel's cipher seals. Any other Device gets the welcome as the handshake's answer, as it always did (ADR-0045).
 */
export class HandshakeReply {
  private early: Answered | undefined;

  public constructor(
    private readonly received: ReceivedHandshake,
    private readonly socket: ChannelCarrier,
  ) {}

  public asking(): void {
    this.early = this.received.answer(bytesOf(asked));
    this.socket.write(frameRecord(this.early.message));
  }

  public welcome(welcome: PairingAnswer): Answered {
    if (this.early) {
      this.socket.write(frameRecord(this.early.cipher.seal(bytesOf(welcome))));

      return this.early;
    }

    const answered = this.received.answer(bytesOf(welcome));

    this.socket.write(frameRecord(answered.message));

    return answered;
  }
}
