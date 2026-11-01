import { EventEmitter, on } from 'node:events';
import type { PairingRegistration } from '@repo/contracts';

/*
 * The Devices that have registered with a Ticket while the pair sheet was open, so the sheet can name the one that asked ("iPhone 15 Pro wants to pair").
 * It holds a claim and nothing more: the Device is already authenticated by its own Device Key, and the name it claims is pre-authentication and decides nothing (ADR-0045).
 */
export class PairingRegistrations {
  private readonly waiting: PairingRegistration[] = [];
  private readonly asking = new Set<string>();
  private readonly arrivals = new EventEmitter<{ registered: [] }>();

  public record(registration: PairingRegistration): void {
    this.waiting.push(registration);
    this.asking.add(registration.deviceId);
    this.arrivals.emit('registered');
  }

  /*
   * The owner answering the prompt about one Device, which that Device's registration does not outlive.
   * It says whether there was a prompt to answer at all, so that answering No stays an answer to this sheet's question rather than a way to unpair any Device the caller can name (ADR-0045).
   */
  public answer(deviceId: string): boolean {
    return this.asking.delete(deviceId);
  }

  // Forgets what the sheet has already asked about; a sheet that opens later starts from the Devices list, not from a prompt about a Device the owner has answered for.
  public clear(): void {
    this.waiting.length = 0;
    this.asking.clear();
  }

  public async *stream(
    signal: AbortSignal,
  ): AsyncGenerator<PairingRegistration> {
    const arrivals = on(this.arrivals, 'registered', { signal });

    try {
      yield* this.drain();

      while (!(await arrivals.next()).done) yield* this.drain();
    } finally {
      await arrivals.return?.();
    }
  }

  private drain(): PairingRegistration[] {
    return this.waiting.splice(0, this.waiting.length);
  }
}
