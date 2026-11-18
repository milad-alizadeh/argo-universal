import { describe, expect, it } from 'vitest';
import { isLocalNetworkDenied } from './local-network-denied';

describe('isLocalNetworkDenied', () => {
  it('reads PolicyDenied and NoAuth from the DNSSD error', () => {
    expect(isLocalNetworkDenied({ code: -65_570, domain: 'DNSSD' })).toBe(
      true,
    );
    expect(isLocalNetworkDenied({ code: -65_555, domain: 'DNSSD' })).toBe(
      true,
    );
  });

  it('does not take any other error for a refusal', () => {
    expect(isLocalNetworkDenied({ code: 'TIMEOUT' })).toBe(false);
    expect(isLocalNetworkDenied(new Error('boom'))).toBe(false);
    expect(isLocalNetworkDenied(null)).toBe(false);
  });
});
