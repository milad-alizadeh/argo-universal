import { describe, expect, it } from 'vitest';
import { storedMessage } from '#mocks/feed';
import { fromFeedRow, toFeedRowWrite } from './feed-row';

const message = storedMessage(0);

describe('fromFeedRow', () => {
  it('reads back the row toFeedRowWrite stores', () => {
    expect(fromFeedRow('session-1', toFeedRowWrite(message))).toEqual(message);
  });

  it('rejects a row from another payload version', () => {
    expect(() =>
      fromFeedRow('session-1', {
        ...toFeedRowWrite(message),
        payloadVersion: 2,
      }),
    ).toThrow('row message-0#0 has payload version 2, not 1');
  });

  it('rejects a payload that carries an envelope field', () => {
    const row = toFeedRowWrite(message);
    expect(() =>
      fromFeedRow('session-1', {
        ...row,
        payload: { ...(row.payload as object), position: 9 },
      }),
    ).toThrow('row message-0#0 has position in its payload');
  });
});
