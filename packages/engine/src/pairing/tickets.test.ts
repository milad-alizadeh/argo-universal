import {
  pairingTicketAttempts,
  pairingTicketLifetimeMs,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { PairingTickets } from './tickets';

const offender = 'offender';

const owner = 'owner';

const other = 'other';

const another = 'another';

const unknownTicket = 'ticket-unknown';

const turnedAway = 'ticket-attempts';

const wrongCode = '000000';

interface ClockedTickets {
  tickets: PairingTickets;
  pass: (ms: number) => void;
}

const clockedTickets = (): ClockedTickets => {
  const clock = { now: 1_000_000 };

  return {
    tickets: new PairingTickets(() => clock.now),
    pass: (ms: number): void => {
      clock.now += ms;
    },
  };
};

const guess = (
  tickets: PairingTickets,
  source: string,
  times: number,
): void => {
  for (let time = 0; time < times; time += 1) tickets.spend(wrongCode, source);
};

it('lets the owner pair after another source has been refused as often as a Ticket allows', () => {
  const { tickets } = clockedTickets();
  const { ticket } = tickets.mint();

  guess(tickets, offender, pairingTicketAttempts * 3);

  expect(tickets.spend(wrongCode, offender)).toBe(turnedAway);
  expect(tickets.spend(ticket, owner)).toBeUndefined();
});

it('turns a source away entirely once it has used its attempts, even with a good Ticket', () => {
  const { tickets } = clockedTickets();
  const { ticket } = tickets.mint();

  guess(tickets, offender, pairingTicketAttempts);

  expect(tickets.spend(ticket, offender)).toBe(turnedAway);
  expect(tickets.spend(ticket, owner)).toBeUndefined();
});

it('lets a source try again after its backoff, and makes the next one longer', () => {
  const { tickets, pass } = clockedTickets();
  guess(tickets, offender, pairingTicketAttempts);

  pass(31_000);
  expect(tickets.spend(wrongCode, offender)).toBe(unknownTicket);
  guess(tickets, offender, pairingTicketAttempts);

  pass(31_000);
  expect(tickets.spend(wrongCode, offender)).toBe(turnedAway);
  pass(31_000);
  expect(tickets.spend(wrongCode, offender)).toBe(unknownTicket);
});

it('still revokes the outstanding Tickets when many sources between them keep guessing', () => {
  const { tickets } = clockedTickets();
  const { ticket } = tickets.mint();

  for (let source = 0; source < pairingTicketAttempts; source += 1)
    guess(tickets, `guesser-${source}`, pairingTicketAttempts);

  expect(tickets.spend(ticket, 'late')).toBe(unknownTicket);
});

it('counts a Ticket that ran out of time against the source that presented it', () => {
  const { tickets, pass } = clockedTickets();
  const { ticket } = tickets.mint();
  pass(pairingTicketLifetimeMs + 1);

  expect(tickets.spend(ticket, offender)).toBe('ticket-expired');
  guess(tickets, offender, pairingTicketAttempts - 1);

  expect(tickets.spend(wrongCode, offender)).toBe(turnedAway);
});

it('names a spent Ticket while it could still have been live, and forgets it after', () => {
  const { tickets, pass } = clockedTickets();
  const { ticket } = tickets.mint();
  tickets.spend(ticket, owner);

  expect(tickets.spend(ticket, other)).toBe('ticket-spent');
  pass(pairingTicketLifetimeMs + 1);
  tickets.mint();

  expect(tickets.spend(ticket, another)).toBe(unknownTicket);
});

describe('a run for the Server key', () => {
  const holder = 'holder';

  it('costs its source nothing when the Device proves it holds a code', () => {
    const { tickets } = clockedTickets();
    tickets.mint();

    for (let run = 0; run < pairingTicketAttempts * 2; run += 1) {
      expect(tickets.offering(holder)).toBeDefined();
      tickets.settled(holder, true);
    }
  });

  it('counts as a wrong Ticket when the Device proves nothing', () => {
    const { tickets } = clockedTickets();

    for (let run = 0; run < pairingTicketAttempts; run += 1) {
      expect(tickets.offering(offender)).toBeDefined();
      tickets.settled(offender, false);
    }

    expect(tickets.offering(offender)).toBeUndefined();
    expect(tickets.offering(owner)).toBeDefined();
  });

  it('is held against its source until it ends, so many at once are not free', () => {
    const { tickets } = clockedTickets();

    for (let run = 0; run < pairingTicketAttempts; run += 1)
      expect(tickets.offering(offender)).toBeDefined();

    expect(tickets.offering(offender)).toBeUndefined();
  });

  it('cannot be started from many sources at once to outrun the total', () => {
    const { tickets } = clockedTickets();

    const started = Array.from(
      { length: pairingTicketAttempts * 20 },
      (_, at) => tickets.offering(`source-${at % 40}`),
    ).filter(Boolean);

    expect(started.length).toBeLessThanOrEqual(pairingTicketAttempts * 10);
  });

  it('offers the Tickets that are live first, and says which have been spent or ran out', () => {
    const { tickets, pass } = clockedTickets();
    const late = tickets.mint().ticket;
    pass(60_000);
    const spent = tickets.mint().ticket;
    tickets.spend(spent, owner);
    pass(61_000);
    const fresh = tickets.mint().ticket;

    expect(tickets.offering(owner)).toEqual([
      { code: fresh, status: 'live' },
      { code: spent, status: 'spent' },
      { code: late, status: 'expired' },
    ]);
  });
});
