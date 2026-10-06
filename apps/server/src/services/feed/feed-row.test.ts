import { describe, expect, it } from 'vitest';
import { storedMessage } from '#mocks/feed';
import { fromFeedRow, promptBlobIds, toFeedRowWrite } from './feed-row';

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

describe('promptBlobIds', () => {
  it('lists each blob a prompt shows once and skips other rows', () => {
    const image = (blobId: string) => ({
      type: 'image' as const,
      mimeType: 'image/png',
      blob: { blobId, mime: 'image/png', bytes: 3 },
    });
    const prompt = (id: string, blobIds: string[]) => ({
      ...message,
      id,
      sessionUpdate: 'user_message' as const,
      content: [{ type: 'text' as const, text: 'Look' }, ...blobIds.map(image)],
    });

    expect(
      promptBlobIds([
        prompt('prompt-1', ['image-1', 'image-2']),
        prompt('prompt-2', ['image-1']),
        { ...message, content: [image('reply-image')] },
      ]),
    ).toEqual(['image-1', 'image-2']);
  });
});
