import { describe, expect, it } from 'vitest';
import { madePageCall } from './page-call-payload';
import { PageCall } from './wire-action';

const sort = { column: 'started', direction: 'descending' };

const move = { id: 'login', section: 'done', index: 0 };

describe('a Component event’s payload', () => {
  it('fills Page state keys from the fields it names', () => {
    const call = PageCall.parse({
      pageState: {
        sortColumn: { $payload: 'column' },
        sortDirection: { $payload: 'direction' },
        page: 1,
      },
    });

    expect(madePageCall(call, sort)).toEqual({
      pageState: {
        sortColumn: 'started',
        sortDirection: 'descending',
        page: 1,
      },
    });
  });

  it('fills an Operation’s arguments beside the fixed ones', () => {
    const call = PageCall.parse({
      operation: 'moveCard',
      args: {
        card: { $payload: 'id' },
        lane: { $payload: 'section' },
        board: 'main',
      },
      optimistic: [{ key: 'login', props: { lane: { $payload: 'section' } } }],
    });

    expect(madePageCall(call, move)).toEqual({
      operation: 'moveCard',
      args: { card: 'login', lane: 'done', board: 'main' },
      optimistic: [{ key: 'login', props: { lane: 'done' } }],
    });
  });

  it('gives the whole payload when it names no field', () => {
    const call = PageCall.parse({
      operation: 'setDone',
      args: { id: 'login', done: { $payload: true } },
    });

    expect(madePageCall(call, true)).toMatchObject({
      args: { id: 'login', done: true },
    });
  });

  it('leaves out a key whose field the payload lacks', () => {
    const call = PageCall.parse({
      operation: 'moveCard',
      args: { card: { $payload: 'id' }, lane: { $payload: 'section' } },
    });

    expect(madePageCall(call, { id: 'login', index: 0 })).toMatchObject({
      args: { card: 'login' },
    });
  });

  it('refuses a value that does not fit where it lands', () => {
    const call = PageCall.parse({ pageState: { sort: { $payload: true } } });

    expect(() => madePageCall(call, sort)).toThrow(
      "The event's payload does not fit Page state",
    );
  });

  it('refuses a payload value that names nothing', () => {
    expect(
      PageCall.safeParse({ pageState: { sort: { $payload: '' } } }).success,
    ).toBe(false);
  });
});
