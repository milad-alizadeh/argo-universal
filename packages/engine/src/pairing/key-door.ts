import type { Socket } from 'node:net';
import { frameRecord } from './frames';
import { HandshakeBuffer } from './handshake-buffer';
import { offerKey, readQuestion, refuseKey } from './key-offer';
import { SeenHandshakes } from './seen-handshakes';
import type { KeyOffer } from './tickets';

export interface KeyDoorDeps {
  readonly publicKey: Buffer;
  // Whether the Device holds a live Ticket's code, counted against the address it knocked from.
  readonly offer: (
    source: string,
    holds: (ticket: string) => boolean,
  ) => KeyOffer;
  readonly report: (subject: string, value: string | undefined) => void;
}

/*
 * The Server's side of a typed code (ADR-0045): one question, one answer, and the socket is closed. Nothing here spends a Ticket and nothing here admits a Device; the handshake that follows does both, on the same terms as a scanned code.
 * A question that repeats one already asked is someone repeating what they watched on the network, and gets nothing.
 */
export class KeyDoor {
  private readonly seen = new SeenHandshakes();

  public constructor(private readonly deps: KeyDoorDeps) {}

  public accept(socket: Socket, opening: Buffer, proven: () => void): void {
    const buffer = new HandshakeBuffer();

    const read = (chunk: Buffer): void => {
      try {
        const message = buffer.push(chunk);

        if (!message) return void socket.once('data', read);
        proven();
        this.answer(socket, message.handshake);
      } catch (cause) {
        this.deps.report('key question', String(cause));
        socket.destroy();
      }
    };

    read(opening);
  }

  private answer(socket: Socket, ask: Buffer): void {
    const question = readQuestion(ask);

    if (!this.seen.accept(question.nonce)) return void socket.destroy();
    socket.end(frameRecord(this.reply(socket, question)));
  }

  private reply(
    socket: Socket,
    question: ReturnType<typeof readQuestion>,
  ): Buffer {
    const source = socket.remoteAddress ?? 'unknown';
    const offer = this.deps.offer(source, question.holds);

    return offer.offered
      ? offerKey(question, offer.ticket, this.deps.publicKey)
      : refuseKey(offer.refusal);
  }
}
