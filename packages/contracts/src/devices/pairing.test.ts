import { describe, expect, it } from 'vitest';
import {
  formatPairingTicket,
  pairingTicketLength,
  readPairingInvite,
  readTypedTicket,
  writePairingInvite,
} from './pairing';

const invite = {
  key: 'server-public-key',
  server: 'Studio Mac',
  ticket: '7KQ4M9XD2B',
};

describe('the invite a QR code carries', () => {
  it('reads back exactly what the Server Device drew', (): void => {
    expect(readPairingInvite(writePairingInvite(invite))).toEqual(invite);
  });

  it.each([
    ['something that is not an Argo code', 'https://example.com/menu'],
    ['an invite with no Ticket in it', '{"key":"k","server":"s"}'],
    [
      'an invite carrying more than an invite',
      JSON.stringify({ ...invite, admin: true }),
    ],
    ['nothing at all', ''],
  ])('refuses %s', (_, scanned): void => {
    expect(readPairingInvite(scanned)).toBeUndefined();
  });
});

describe('the Pairing Ticket as the owner reads it aloud and types it', () => {
  const ticket = '7KQ4M9XD2B';

  it('is read as two groups, and typed back to the same Ticket', (): void => {
    expect(formatPairingTicket(ticket)).toBe('7KQ4M-9XD2B');
    expect(readTypedTicket(formatPairingTicket(ticket))).toBe(ticket);
  });

  it.each([
    ['lowercase', '7kq4m-9xd2b'],
    ['spaces for the dash', '7KQ4M 9XD2B'],
    ['no separator at all', '7KQ4M9XD2B'],
    ['a dot and a space', ' 7KQ4M · 9XD2B '],
  ])('accepts %s', (_, typed): void => {
    expect(readTypedTicket(typed)).toBe(ticket);
  });

  it('reads the letters that look like digits as the digits', (): void => {
    expect(readTypedTicket('OIL4M-9XD2B')).toBe('011' + '4M9XD2B');
  });

  it.each([
    ['too short', '7KQ4M-9XD2'],
    ['too long', '7KQ4M-9XD2BB'],
    ['a letter Crockford leaves out', '7KQ4U-9XD2B'],
    ['a symbol', '7KQ4M-9XD!B'],
    ['nothing', ''],
  ])('refuses a code that is %s', (_, typed): void => {
    expect(readTypedTicket(typed)).toBeUndefined();
  });

  it('is as long as a Ticket is minted', (): void => {
    expect(ticket).toHaveLength(pairingTicketLength);
  });
});
