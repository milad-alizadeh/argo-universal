import { describe, expect, it } from 'vitest';
import { readPairingInvite, writePairingInvite } from './pairing';

const invite = {
  key: 'server-public-key',
  server: 'Studio Mac',
  ticket: '048213',
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
