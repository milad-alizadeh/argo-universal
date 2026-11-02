import { randomInt } from 'node:crypto';
import {
  pairingTicketAlphabet,
  pairingTicketAttempts,
  pairingTicketLength,
  pairingTicketLifetimeMs,
  type PairingRefusal,
} from '@repo/contracts';
import type { OfferedTicket } from '@repo/contracts/pake';
import { TicketAttempts } from './ticket-attempts';
import { offeredTickets } from './ticket-standing';

export interface MintedTicket {
  readonly ticket: string;
  readonly expiresAt: number;
}

const randomCode = (): string =>
  Array.from(
    { length: pairingTicketLength },
    () => pairingTicketAlphabet[randomInt(pairingTicketAlphabet.length)],
  ).join('');

const unknownTicket = 'ticket-unknown';

const spentTicket = 'ticket-spent';

const tooManyAttempts = 'ticket-attempts';

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
  // Runs for a key, from any source, that have not ended: each could be a guess, so they count against the Tickets' total before they settle.
  private running = 0;

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
    if (this.attempts.blocked(source)) return tooManyAttempts;
    const refusal = this.check(ticket);

    return refusal ? this.refuse(source, refusal) : undefined;
  }

  /*
   * Starts a run for the Server's key by a Device that was typed the code instead of shown the QR (ADR-0045). Answers the Tickets the Server can say something about, or nothing when this source has been turned away.
   * The run is held against the source until it ends: a Device that proves it holds one of the codes costs its source nothing, and any other run is a wrong Ticket, so a code cannot be guessed here any faster than at the handshake. Nothing is spent: the handshake that follows spends the Ticket.
   */
  public offering(source: string): OfferedTicket[] | undefined {
    if (
      this.attempts.blocked(source) ||
      this.refusals + this.running >= mostRefusals
    )
      return undefined;
    this.attempts.started(source);
    this.running += 1;

    return offeredTickets(this.live, this.spent, this.now());
  }

  // The run for a key ended, and whether the Device proved it holds a code the Server offered.
  public settled(source: string, proved: boolean): void {
    this.attempts.ended(source);
    this.running -= 1;

    if (!proved) this.refuse(source, unknownTicket);
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
      ? spentTicket
      : unknownTicket;
  }

  private refuse(source: string, refusal: PairingRefusal): PairingRefusal {
    this.attempts.refused(source);
    this.refusals += 1;

    if (this.refusals < mostRefusals) return refusal;
    this.revoke();

    return tooManyAttempts;
  }

  private unusedCode(): string {
    let ticket = randomCode();

    while (this.live.has(ticket) || this.spent.has(ticket))
      ticket = randomCode();

    return ticket;
  }

  private forgetSpent(): void {
    for (const [ticket, expiresAt] of this.spent)
      if (expiresAt <= this.now()) this.spent.delete(ticket);
  }
}
