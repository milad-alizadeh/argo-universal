import { describe, expect, it } from 'vitest';
import { pairLinkIn, pairPathOf } from './pair-link';

describe('the pairing link of a build that carries the code in it', () => {
  it('reads the code and where the Server answers', () => {
    expect(
      pairLinkIn({ invite: 'abc', host: 'studio.local', port: '7337' }, true),
    ).toEqual({ invite: 'abc', address: { host: 'studio.local', port: 7337 } });
  });

  it('reads the code alone when no address came with it', () => {
    expect(pairLinkIn({ invite: 'abc' }, true)).toEqual({
      invite: 'abc',
      address: undefined,
    });
  });

  it('ignores the code in any other build', () => {
    expect(pairLinkIn({ invite: 'abc' }, false)).toBeUndefined();
  });

  it('sends the add-a-Server link to Pairing, keeping what it carries', () => {
    expect(pairPathOf('/settings/servers/add?invite=abc&port=1', true)).toBe(
      '/pair?invite=abc&port=1',
    );
  });

  it.each(['/settings/servers/add?invite=abc', '/sessions'])(
    'leaves %s where it is in any other build',
    (path) => {
      expect(pairPathOf(path, false)).toBe(path);
    },
  );

  it('leaves every other link where it is', () => {
    expect(pairPathOf('/sessions', true)).toBe('/sessions');
  });
});
