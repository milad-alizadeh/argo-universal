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
  ticket: '482915',
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
  const ticket = '482915';

  it('is read as two groups, and typed back to the same Ticket', (): void => {
    expect(formatPairingTicket(ticket)).toBe('482-915');
    expect(readTypedTicket(formatPairingTicket(ticket))).toBe(ticket);
  });

  it.each([
    ['spaces for the dash', '482 915'],
    ['no separator at all', '482915'],
    ['a dot and a space', ' 482 · 915 '],
    ['leading zeros', '000123'],
  ])('accepts %s', (_, typed): void => {
    expect(readTypedTicket(typed)).toBe(typed.replaceAll(/[\s·.]/g, ''));
  });

  it.each([
    ['too short', '482-91'],
    ['too long', '482-9155'],
    ['a letter', '482-91A'],
    ['a symbol', '482-91!'],
    ['nothing', ''],
  ])('refuses a code that is %s', (_, typed): void => {
    expect(readTypedTicket(typed)).toBeUndefined();
  });

  it('is as long as a Ticket is minted', (): void => {
    expect(ticket).toHaveLength(pairingTicketLength);
  });
});
