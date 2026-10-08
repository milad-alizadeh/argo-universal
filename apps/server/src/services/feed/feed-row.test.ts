import type {
  BlobRef,
  ImageContent,
  TextContent,
  UserMessage,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { storedMessage } from '#mocks/feed';
import {
  fromFeedRow,
  newestRows,
  promptBlobIds,
  toFeedRowWrite,
} from './feed-row';

const message = storedMessage(0);

describe('fromFeedRow', (): void => {
  it('reads back the row toFeedRowWrite stores', (): void => {
    expect(fromFeedRow('session-1', toFeedRowWrite(message))).toEqual(message);
  });

  it('rejects a row from another payload version', (): void => {
    expect((): ReturnType<typeof fromFeedRow> =>
      fromFeedRow('session-1', {
        ...toFeedRowWrite(message),
        payloadVersion: 2,
      }),
    ).toThrow('row message-0#0 has payload version 2, not 1');
  });

  it('rejects a payload that carries an envelope field', (): void => {
    const row = toFeedRowWrite(message);
    expect((): ReturnType<typeof fromFeedRow> =>
      fromFeedRow('session-1', {
        ...row,
        payload: { ...(row.payload as object), position: 9 },
      }),
    ).toThrow('row message-0#0 has position in its payload');
  });
});

describe('promptBlobIds', (): void => {
  it('lists each blob a prompt shows once and skips other rows', (): void => {
    const image = (
      blobId: string,
    ): Omit<ImageContent, 'blob' | '_meta'> & {
      blob: Pick<BlobRef, 'blobId' | 'mime' | 'bytes'>;
    } => ({
      type: 'image' as const,
      mimeType: 'image/png',
      blob: { blobId, mime: 'image/png', bytes: 3 },
    });
    const prompt = (
      id: string,
      blobIds: string[],
    ): Omit<UserMessage, 'content'> & {
      content: (TextContent | ReturnType<typeof image>)[];
    } => ({
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

it.each([
  {
    rule: 'keeps a higher revision over a later stale row',
    rows: [
      {
        ...message,
        revision: 3,
        content: [{ type: 'text' as const, text: 'Newer' }],
      },
      { ...message, revision: 1 },
    ],
    text: 'Newer',
    revision: 3,
  },
  {
    rule: 'later input wins when revisions tie',
    rows: [
      message,
      { ...message, content: [{ type: 'text' as const, text: 'In memory' }] },
    ],
    text: 'In memory',
    revision: 1,
  },
])('$rule', ({ rows, text, revision }): void => {
  const original = structuredClone(rows);
  expect([...newestRows(rows).values()]).toEqual([
    {
      ...message,
      revision,
      content: [{ type: 'text', text }],
    },
  ]);
  expect(rows).toEqual(original);
});
