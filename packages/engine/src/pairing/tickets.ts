import { randomInt } from 'node:crypto';
import {
  pairingTicketAlphabet,
  pairingTicketAttempts,
  pairingTicketLength,
  pairingTicketLifetimeMs,
  type PairingRefusal,
} from '@repo/contracts';
import { TicketAttempts } from './ticket-attempts';

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

const refusedOffer = (refusal: PairingRefusal): KeyOffer => ({
  offered: false,
  refusal,
});

const turnedAway = refusedOffer(tooManyAttempts);

// A holder of a live Ticket's code is offered the Server's key, or told why not; asking spends nothing.
export type KeyOffer =
  | { offered: true; ticket: string }
  | { offered: false; refusal: PairingRefusal };

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
    if (this.attempts.blocked(source)) return tooManyAttempts;
    const refusal = this.check(ticket);

    return refusal ? this.refuse(source, refusal) : undefined;
  }

  /*
   * Whether someone who can prove they hold a Ticket's code may be told the Server's key, for a Device that was typed the code instead of shown the QR (ADR-0045).
   * `proves` is the caller's test of a code against what the Device sent, so the code itself never crosses the wire. Nothing is spent: the Ticket is spent by the handshake that follows, on the same terms as a scanned one.
   * A code that matches nothing is held against the source like any wrong Ticket, and one that matches a Ticket past its time or already spent says so, because only a holder of the code can hear it.
   */
  public offer(source: string, proves: (ticket: string) => boolean): KeyOffer {
    if (this.attempts.blocked(source)) return turnedAway;
    const held = this.holding(proves);

    return held ?? refusedOffer(this.refuse(source, unknownTicket));
  }

  private holding(proves: (ticket: string) => boolean): KeyOffer | undefined {
    return this.holdingLive(proves) ?? this.holdingSpent(proves);
  }

  private holdingLive(
    proves: (ticket: string) => boolean,
  ): KeyOffer | undefined {
    const held = [...this.live].find(([ticket]) => proves(ticket));

    return held ? this.offerFor(...held) : undefined;
  }

  private holdingSpent(
    proves: (ticket: string) => boolean,
  ): KeyOffer | undefined {
    const held = [...this.spent].find(
      ([ticket, expiresAt]) => expiresAt > this.now() && proves(ticket),
    );

    return held ? refusedOffer(spentTicket) : undefined;
  }

  private offerFor(ticket: string, expiresAt: number): KeyOffer {
    return expiresAt > this.now()
      ? { offered: true, ticket }
      : refusedOffer('ticket-expired');
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
