import { randomInt } from 'node:crypto';
import {
  pairingTicketAttempts,
  pairingTicketDigits,
  pairingTicketLifetimeMs,
  type PairingRefusal,
} from '@repo/contracts';

const codes = 10 ** pairingTicketDigits;

export interface MintedTicket {
  readonly ticket: string;
  readonly expiresAt: number;
}

const sixDigits = (): string =>
  String(randomInt(codes)).padStart(pairingTicketDigits, '0');

/*
 * The Pairing Tickets a Server has outstanding. A Ticket is good once and for about two minutes, and the pair sheet mints another while it is open (ADR-0045).
 * It is not the credential: spending one lets a Device register its own Device Key, and from then on the Device authenticates with that and the Ticket is spent.
 */
export class PairingTickets {
  private readonly live = new Map<string, number>();
  private readonly spent = new Set<string>();
  private refusals = 0;

  public constructor(private readonly now: () => number = Date.now) {}

  public mint(): MintedTicket {
    const ticket = sixDigits();
    const expiresAt = this.now() + pairingTicketLifetimeMs;
    this.live.set(ticket, expiresAt);

    return { ticket, expiresAt };
  }

  // Answers why a Ticket was refused, or nothing when it was good and is now spent.
  public spend(ticket: string): PairingRefusal | undefined {
    const expiresAt = this.live.get(ticket);

    if (expiresAt === undefined) return this.refuse(ticket);
    this.live.delete(ticket);
    this.spent.add(ticket);

    return expiresAt > this.now() ? undefined : 'ticket-expired';
  }

  // Every outstanding Ticket at once: the pair sheet closing, or too many codes refused.
  public revoke(): void {
    this.live.clear();
    this.refusals = 0;
  }

  private refuse(ticket: string): PairingRefusal {
    if (this.spent.has(ticket)) return 'ticket-spent';
    this.refusals += 1;

    if (this.refusals < pairingTicketAttempts) return 'ticket-unknown';
    this.revoke();

    return 'ticket-attempts';
  }
}
