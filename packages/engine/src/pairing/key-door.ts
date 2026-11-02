import { randomBytes } from 'node:crypto';
import type { Socket } from 'node:net';
import {
  answerRun,
  refuseRun,
  type OfferedTicket,
  type ServerRun,
} from '@repo/contracts/pake';
import { frameRecord } from './frames';
import { HandshakeBuffer } from './handshake-buffer';
import { KeyRun } from './key-run';

export interface KeyDoorDeps {
  readonly publicKey: Buffer;
  // Starts a run from this source for the Tickets the Server can say something about, or nothing when the source has been turned away.
  readonly offering: (source: string) => OfferedTicket[] | undefined;
  // Ends that run, and whether the Device proved it holds one of the codes.
  readonly settled: (source: string, proved: boolean) => void;
  readonly report: (subject: string, value: string | undefined) => void;
}

interface Asked {
  readonly source: string;
  readonly ask: Buffer;
  readonly offered: OfferedTicket[];
}

const turnedAway = frameRecord(Buffer.from(refuseRun('ticket-attempts')));

/*
 * The Server's side of a typed code (ADR-0045): the Device opens a password-authenticated key exchange keyed by its code, the Server answers with one entry per outstanding Ticket, and the Device proves it opened one. Nothing here spends a Ticket and nothing here admits a Device; the handshake that follows does both, on the same terms as a scanned code.
 * What the Server answers carries nothing a watcher can test a guessed code against, so the only way to learn a code is to run this against the Server, and each run that does not end in a proof is counted against its source.
 */
export class KeyDoor {
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
    const source = socket.remoteAddress ?? 'unknown';
    const offered = this.deps.offering(source);

    if (offered) this.begin(socket, { source, ask, offered });
    else socket.end(turnedAway);
  }

  private begin(socket: Socket, asked: Asked): void {
    const settle = (proved: boolean): void =>
      this.deps.settled(asked.source, proved);

    const run = this.run(asked, settle);

    if (!run) return void socket.destroy();
    new KeyRun(socket, run, settle).start(frameRecord(Buffer.from(run.reply)));
  }

  // A run whose opening is no opening is a guess like any other.
  private run(
    { ask, offered }: Asked,
    settle: (proved: boolean) => void,
  ): ServerRun | undefined {
    const offering = { tickets: offered, publicKey: this.deps.publicKey };

    try {
      return answerRun(ask, offering, randomBytes);
    } catch (cause) {
      this.deps.report('key question', String(cause));
      settle(false);

      return undefined;
    }
  }
}
