import type { Socket } from 'node:net';
import type { ServerRun } from '@repo/contracts/pake';
import { FrameReader } from './frames';

// A Device that has been answered and says nothing more is a guess that went away, and is counted as one.
const confirmWaitMs = 10_000;

/*
 * One Device's run for the Server's key after the Server has answered: it waits for the Device's proof that it holds one of the codes, and tells the Server how the run ended exactly once (ADR-0045).
 * A proof that does not verify, a socket that closes without one, and one that never sends it are all the same ending: a guess.
 */
export class KeyRun {
  private readonly frames = new FrameReader();
  private ended = false;

  public constructor(
    private readonly socket: Socket,
    private readonly run: ServerRun,
    private readonly settle: (proved: boolean) => void,
  ) {}

  public start(reply: Buffer): void {
    this.socket.setTimeout(
      confirmWaitMs,
      (): void => void this.socket.destroy(),
    );
    this.socket.on('data', (chunk): void => this.hear(chunk));
    this.socket.once('close', (): void => this.end(false));
    this.socket.write(reply);
  }

  private hear(chunk: Buffer): void {
    const [confirm] = this.frames.push(chunk);

    if (!confirm) return;
    this.end(this.run.proves(confirm));
    this.socket.end();
  }

  private end(proved: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.settle(proved);
  }
}
