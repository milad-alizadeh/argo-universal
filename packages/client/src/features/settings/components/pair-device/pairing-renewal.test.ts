import { pairingTicketLifetimeMs } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { renewsAt } from './pairing-renewal';

describe('when the pair sheet swaps its code for a new one', () => {
  const minted = Date.parse('2026-11-18T12:00:00.000Z');
  const expiresAt = new Date(minted + pairingTicketLifetimeMs).toISOString();

  it('swaps it before the Ticket runs out, so the code on screen is always one the Server accepts', () => {
    expect(renewsAt(expiresAt)).toBeLessThan(Date.parse(expiresAt));
  });
});
