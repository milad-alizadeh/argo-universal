import { describe, expect, it } from 'vitest';
import { headerClaims, pageHeaderHost } from './page-header-host';

describe('pageHeaderHost', () => {
  it.each([
    [{ navigator: false, atDrawerRoot: false, wide: false }, 'none'],
    [{ navigator: false, atDrawerRoot: true, wide: false }, 'none'],
    [{ navigator: true, atDrawerRoot: true, wide: false }, 'drawer'],
    [{ navigator: true, atDrawerRoot: true, wide: true }, 'stack'],
    [{ navigator: true, atDrawerRoot: false, wide: false }, 'stack'],
    [{ navigator: true, atDrawerRoot: false, wide: true }, 'stack'],
  ] as const)('%j is drawn by %s', (place, expected) => {
    expect(pageHeaderHost(place)).toBe(expected);
  });
});

describe('headerClaims', () => {
  const leaving = Symbol('leaving');
  const arriving = Symbol('arriving');

  it('lets a Page clear the header it still holds', () => {
    const claims = headerClaims();
    claims.claim('plugins', leaving);

    expect(claims.release('plugins', leaving)).toBe(true);
  });

  it('keeps the arriving Page’s header when the leaving Page cleans up after it', () => {
    const claims = headerClaims();
    claims.claim('plugins', leaving);
    claims.claim('plugins', arriving);

    expect(claims.release('plugins', leaving)).toBe(false);
    expect(claims.release('plugins', arriving)).toBe(true);
  });

  it('keeps each route’s header apart', () => {
    const claims = headerClaims();
    claims.claim('plugins', leaving);
    claims.claim('sessions', arriving);

    expect(claims.release('plugins', leaving)).toBe(true);
  });

  it('clears a header once', () => {
    const claims = headerClaims();
    claims.claim('plugins', leaving);
    claims.release('plugins', leaving);

    expect(claims.release('plugins', leaving)).toBe(false);
  });
});
