import { describe, expect, it } from 'vitest';
import { returnParams, returnToOf } from './return-to';

const agents = '/settings/agents';

describe('returnParams', () => {
  it('names the page a page in another section was opened from', () => {
    expect(returnParams(agents, '/sessions/new')).toEqual({
      returnTo: '%2Fsessions%2Fnew',
    });
  });

  it.each([
    ['/sessions', '/sessions/abc'],
    ['/settings', agents],
    ['/plugins/tracker/issues', '/plugins/tracker/issues/1'],
  ])('carries nothing when opened from its own section (%s)', (from, to) => {
    expect(returnParams(to, from)).toEqual({});
  });

  it('carries nothing when no page was shown', () => {
    expect(returnParams(agents)).toEqual({});
  });

  it('tells two Plugin sections apart', () => {
    expect(returnParams('/plugins/b/two/1', '/plugins/a/one/1')).toHaveProperty(
      'returnTo',
    );
  });
});

describe('returnToOf', () => {
  it('reads back what returnParams wrote, query and all', () => {
    const from = '/sessions/new?draft=%2Fpath&projectId=1';

    expect(returnToOf(returnParams(agents, from))).toBe(from);
  });

  it.each([undefined, {}, { returnTo: ['a', 'b'] }])(
    'finds none in %j',
    (params) => {
      expect(returnToOf(params)).toBeUndefined();
    },
  );
});
