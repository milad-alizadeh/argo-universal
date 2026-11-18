import { readPairingInvite, writePairingInvite } from '@repo/contracts';
import qrcode from 'qrcode-generator';
import { describe, expect, it } from 'vitest';

describe('the pairing invite encoded for the QR camera', () => {
  it.each(['Studio Mac', 'Milad’s MacBook', '工作电脑', 'Studio 🖥️'])(
    'preserves the Server name %s through the QR byte encoder',
    (server) => {
      const invite = { key: 'server-public-key', server, ticket: '482915' };
      // The byte conversion used by qrcode-generator's default Byte mode.
      const bytes = qrcode.stringToBytes(writePairingInvite(invite));
      const scanned = new TextDecoder().decode(new Uint8Array(bytes));

      expect(readPairingInvite(scanned)).toEqual(invite);
    },
  );
});
