import { bytesToHex } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { generator, readElement } from './group';
import {
  answerRun,
  refuseRun,
  startRun,
  type OfferedTicket,
  type Offering,
  type DeviceRun,
  type Reading,
  type ServerRun,
  type RandomBytes,
} from './index';
import { entryBytes, mostOffered } from './wire';

const random: RandomBytes = (length): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(length));

const serverKey = random(32);

const code = '482915';

const turnedAway = 'ticket-attempts';

const offering = (tickets: readonly OfferedTicket[]): Offering => ({
  tickets,
  publicKey: serverKey,
});

const live = (ticket: string): OfferedTicket => ({
  code: ticket,
  status: 'live',
});

interface Whole {
  device: DeviceRun;
  server: ServerRun;
  reading: Reading;
}

// One whole run, as it crosses the wire.
function run(typed: string, offered: readonly OfferedTicket[]): Whole {
  const device = startRun(typed, random);
  const server = answerRun(device.ask, offering(offered), random);
  const reading = device.read(server.reply);

  return { device, server, reading };
}

describe('a Device that holds the code', () => {
  it('is given the Server key and proves it to the Server', () => {
    const { server, reading } = run(code, [live(code)]);

    expect(reading.offer).toEqual({ offered: true, publicKey: serverKey });
    expect(reading.confirm && server.proves(reading.confirm)).toBe(true);
  });

  it('finds its own Ticket among several outstanding ones', () => {
    const offered = [live('111111'), live(code), live('222222')];
    const { server, reading } = run(code, offered);

    expect(reading.offer).toEqual({ offered: true, publicKey: serverKey });
    expect(reading.confirm && server.proves(reading.confirm)).toBe(true);
  });

  it.each([
    ['spent', 'ticket-spent'],
    ['expired', 'ticket-expired'],
  ] as const)(
    'is told a %s Ticket is, and still proves it holds it',
    (status, refusal) => {
      const { server, reading } = run(code, [{ code, status }]);

      expect(reading.offer).toEqual({ offered: false, refusal });
      expect(reading.confirm && server.proves(reading.confirm)).toBe(true);
    },
  );
});

describe('a Device that does not hold the code', () => {
  it('opens nothing, is given no key, and has nothing to prove with', () => {
    const { server, reading } = run('000000', [live(code)]);

    expect(reading.offer).toEqual({
      offered: false,
      refusal: 'ticket-unknown',
    });
    expect(reading.confirm).toBeUndefined();
    expect(server.proves(new Uint8Array(33))).toBe(false);
  });

  it('cannot prove it with the proof of a run it watched', () => {
    const first = run(code, [live(code)]);
    const second = run(code, [live(code)]);

    expect(first.reading.confirm).toBeDefined();
    expect(
      second.server.proves(first.reading.confirm ?? new Uint8Array()),
    ).toBe(false);
  });

  it('is not given an answer that was sent to another run', () => {
    const watched = run(code, [live(code)]);
    const device = startRun(code, random);

    expect(device.read(watched.server.reply).offer).toEqual({
      offered: false,
      refusal: 'ticket-unknown',
    });
  });

  it.each([
    ['one of the wrong length', new Uint8Array(47), 'malformed opening'],
    ['the identity element', new Uint8Array(48), 'identity'],
  ])('is refused an opening that is %s', (_, opening, message) => {
    expect(() => answerRun(opening, offering([live(code)]), random)).toThrow(
      message,
    );
  });
});

describe('a transcript a watcher recorded', () => {
  it('has every entry decode as an element, so none can be told for a pad', () => {
    const { server } = run(code, [live(code)]);

    const entries = Array.from({ length: mostOffered }, (_, at) =>
      server.reply.subarray(1 + at * entryBytes, 1 + at * entryBytes + 32),
    );

    expect(entries.every((entry) => readElement(entry))).toBe(true);
  });

  it('holds neither the Server key nor anything the code makes by itself', () => {
    const { device, server } = run(code, [live(code)]);
    const sid = device.ask.subarray(0, 16);
    const seen = bytesToHex(new Uint8Array([...device.ask, ...server.reply]));

    expect(seen).not.toContain(bytesToHex(serverKey));
    expect(seen).not.toContain(bytesToHex(generator(code, sid).toBytes()));
  });

  it('looks different every run, so no run can be told from the code', () => {
    const first = run(code, [live(code)]);
    const second = run(code, [live(code)]);

    expect(first.server.reply).not.toEqual(second.server.reply);
    expect(first.device.ask).not.toEqual(second.device.ask);
  });

  it('gives a guess nothing to check without running against the Server', () => {
    const { device, server } = run(code, [live(code)]);
    const sid = device.ask.subarray(0, 16);

    // Everything a watcher can compute from a guess and the transcript: the guess's own generator. It appears nowhere in what was recorded, for the true code or any other.
    const seen = bytesToHex(new Uint8Array([...device.ask, ...server.reply]));

    const matches = ['482915', '000000', '123456', '999999'].filter((guess) =>
      seen.includes(bytesToHex(generator(guess, sid).toBytes())),
    );

    expect(matches).toEqual([]);
  });
});

describe('a Server that turns a source away', () => {
  it('says so in the open, and the Device reads it as it said it', () => {
    const device = startRun(code, random);

    expect(
      device.read(Uint8Array.of(0, ...new TextEncoder().encode(turnedAway)))
        .offer,
    ).toEqual({
      offered: false,
      refusal: turnedAway,
    });
    expect(refuseRun(turnedAway)[0]).toBe(0);
  });
});
