import { EventEmitter, on } from 'node:events';
import {
  pairingAnswerLifetimeMs,
  type PairingRegistration,
} from '@repo/contracts';

// What became of a registration the Server held: the owner allowed it, refused it, or never answered.
export type Answer = 'allowed' | 'declined' | 'unanswered';

interface Held {
  readonly registration: PairingRegistration;
  // Writes the Device down; run when, and only when, the owner allows it.
  readonly commit: () => Promise<void>;
  readonly settle: (answer: Answer) => void;
  readonly fail: (cause: unknown) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/*
 * The Devices that have spent a Ticket while the pair sheet was open and are waiting for the owner, so the sheet can name the one that asked ("iPhone 15 Pro wants to pair").
 * The Server holds each registration here and writes nothing down until the owner allows it: a Device that has not been allowed has no row, no identity and no Connection (ADR-0045).
 * The name a Device claims is pre-authentication and untrusted; it is shown for recognition and decides nothing.
 */
export class PairingRegistrations {
  private readonly held = new Map<string, Held>();
  private readonly arrivals = new EventEmitter<{ registered: [] }>();

  public constructor(
    private readonly answerWindowMs = pairingAnswerLifetimeMs,
  ) {}

  /*
   * Holds a registration until the owner answers it. `commit` is what makes the Device a Paired Device, and runs only on Allow.
   * The owner not answering within the window, or closing the sheet, is an answer of its own, and grants nothing.
   */
  public ask(
    registration: PairingRegistration,
    commit: () => Promise<void>,
  ): Promise<Answer> {
    return new Promise<Answer>((settle, fail): void => {
      const { deviceId } = registration;

      const timer = setTimeout(
        () => this.release(deviceId, 'unanswered'),
        this.answerWindowMs,
      );

      this.held.set(deviceId, { registration, commit, settle, fail, timer });
      this.arrivals.emit('registered');
    });
  }

  // Allow: the Device is written down and then, only then, let in. It says whether there was a prompt to answer at all.
  public async allow(deviceId: string): Promise<boolean> {
    const held = this.take(deviceId);

    if (!held) return false;

    try {
      await held.commit();
      held.settle('allowed');
    } catch (cause) {
      held.fail(cause);
      throw cause;
    }

    return true;
  }

  /*
   * The owner's No. It says whether there was a prompt to answer at all, so that answering stays an answer to this sheet's question rather than a way to affect any Device the caller can name (ADR-0045).
   */
  public decline(deviceId: string): boolean {
    return this.release(deviceId, 'declined');
  }

  // Forgets what the sheet has already asked about: a Device nobody answered stays out, and a sheet that opens later starts from the Devices list.
  public clear(): void {
    for (const deviceId of this.held.keys())
      this.release(deviceId, 'unanswered');
  }

  public async *stream(
    signal: AbortSignal,
  ): AsyncGenerator<PairingRegistration> {
    const arrivals = on(this.arrivals, 'registered', { signal });
    const told = new Set<string>();

    try {
      yield* this.untold(told);

      while (!(await arrivals.next()).done) yield* this.untold(told);
    } finally {
      await arrivals.return?.();
    }
  }

  private release(deviceId: string, answer: Answer): boolean {
    const held = this.take(deviceId);

    held?.settle(answer);

    return held !== undefined;
  }

  private take(deviceId: string): Held | undefined {
    const held = this.held.get(deviceId);

    if (held) clearTimeout(held.timer);
    this.held.delete(deviceId);

    return held;
  }

  // What is still being held and this watcher has not yet been told about, so a sheet that reconnects meets the prompt it missed and no watcher takes another's.
  private untold(told: Set<string>): PairingRegistration[] {
    const fresh = this.held
      .values()
      .map(({ registration }) => registration)
      .filter(({ deviceId }) => !told.has(deviceId))
      .toArray();

    for (const { deviceId } of fresh) told.add(deviceId);

    return fresh;
  }
}
