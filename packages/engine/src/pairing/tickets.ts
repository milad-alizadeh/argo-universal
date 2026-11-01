import { randomInt } from 'node:crypto';
import {
  pairingTicketAttempts,
  pairingTicketDigits,
  pairingTicketLifetimeMs,
  type PairingRefusal,
} from '@repo/contracts';
import { TicketAttempts } from './ticket-attempts';

const codes = 10 ** pairingTicketDigits;

export interface MintedTicket {
  readonly ticket: string;
  readonly expiresAt: number;
}

const sixDigits = (): string =>
  String(randomInt(codes)).padStart(pairingTicketDigits, '0');

// Across every source, so many addresses cannot guess one Ticket between them: a source gets `pairingTicketAttempts` on its own, and the Ticket survives ten sources' worth.
const mostRefusals = pairingTicketAttempts * 10;

/*
 * The Pairing Tickets a Server has outstanding. A Ticket is good once and for about two minutes, and the pair sheet mints another while it is open (ADR-0045).
 * It is not the credential: spending one lets a Device register its own Device Key, and from then on the Device authenticates with that and the Ticket is spent.
 * A wrong code is held against the source that sent it, so one Device on the local network cannot burn the owner's Ticket; only a guessing spread over many sources revokes it.
 */
export class PairingTickets {
  private readonly live = new Map<string, number>();
  // A spent Ticket is remembered only for as long as it could have been live, so the set stays as small as the Tickets of the last two minutes.
  private readonly spent = new Map<string, number>();
  private readonly attempts: TicketAttempts;
  private refusals = 0;

  public constructor(private readonly now: () => number = Date.now) {
    this.attempts = new TicketAttempts(now);
  }

  public mint(): MintedTicket {
    this.forgetSpent();
    const ticket = this.unusedCode();
    const expiresAt = this.now() + pairingTicketLifetimeMs;
    this.live.set(ticket, expiresAt);

    return { ticket, expiresAt };
  }

  // Answers why a Ticket was refused, or nothing when it was good and is now spent.
  public spend(ticket: string, source: string): PairingRefusal | undefined {
    if (this.attempts.blocked(source)) return 'ticket-attempts';
    const refusal = this.check(ticket);

    return refusal ? this.refuse(source, refusal) : undefined;
  }

  // Spends the Ticket if it is good, and says why not if it is not.
  private check(ticket: string): PairingRefusal | undefined {
    const expiresAt = this.live.get(ticket);

    if (expiresAt === undefined) return this.unknown(ticket);
    this.live.delete(ticket);

    if (expiresAt <= this.now()) return 'ticket-expired';
    this.spent.set(ticket, expiresAt);

    return undefined;
  }

  // Every outstanding Ticket at once: the pair sheet closing, or too many codes refused.
  public revoke(): void {
    this.live.clear();
    this.refusals = 0;
  }

  private unknown(ticket: string): PairingRefusal {
    return (this.spent.get(ticket) ?? 0) > this.now()
      ? 'ticket-spent'
      : 'ticket-unknown';
  }

  private refuse(source: string, refusal: PairingRefusal): PairingRefusal {
    this.attempts.refused(source);
    this.refusals += 1;

    if (this.refusals < mostRefusals) return refusal;
    this.revoke();

    return 'ticket-attempts';
  }

  private unusedCode(): string {
    let ticket = sixDigits();

    while (this.live.has(ticket) || this.spent.has(ticket))
      ticket = sixDigits();

    return ticket;
  }

  private forgetSpent(): void {
    for (const [ticket, expiresAt] of this.spent)
      if (expiresAt <= this.now()) this.spent.delete(ticket);
  }
}
