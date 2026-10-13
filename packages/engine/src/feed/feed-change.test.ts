import type { FeedChange } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { accepted } from '#mocks/feed-change-accepted';
import { expectedStreamEvent } from '#mocks/feed-change-inputs';
import {
  message,
  feedWith,
  update,
  firstMessageRowId,
  messageTextField,
} from '#mocks/feed-change-inputs';
import { rejected } from '#mocks/feed-change-rejected';
import { applyFeedChange } from './feed-change';

describe('applyFeedChange', (): void => {
  it.each(accepted)(
    '$name',
    ({ rows, change, turnId = 'turn-1', rowAfter, streamEvent }): void => {
      const feed = feedWith(...rows);
      expect(applyFeedChange(feed, change, turnId)).toEqual({
        feed: {
          ...feed,
          maxRevision: 9,
          nextPosition: rowAfter.id in feed.rows ? 5 : 6,
          rows: { ...feed.rows, [rowAfter.id]: rowAfter },
        },
        streamEvent: expectedStreamEvent(rowAfter, streamEvent),
      });
    },
  );

  it.each(rejected)('rejects $name', ({ feed, change, rejection }): void => {
    expect(applyFeedChange(feed, change, 'turn-1')).toEqual({
      rejection: expect.stringMatching(rejection),
    });
  });

  it('raises the revision by one for each change', (): void => {
    const changes: FeedChange[] = [
      {
        type: 'upsert',
        update: update(message({ content: [{ type: 'text', text: '' }] })),
      },
      {
        type: 'append',
        id: firstMessageRowId,
        field: messageTextField,
        text: 'a',
      },
      {
        type: 'append',
        id: firstMessageRowId,
        field: messageTextField,
        text: 'b',
      },
      { type: 'patch', id: firstMessageRowId, set: { state: 'settled' } },
    ];

    let feed = feedWith();
    const revisions: number[] = [];

    for (const change of changes) {
      const result = applyFeedChange(feed, change, 'turn-1');

      if ('rejection' in result) throw new Error(result.rejection);
      feed = result.feed;
      revisions.push(result.streamEvent.rev);
    }

    expect(revisions).toEqual([9, 10, 11, 12]);
    expect(feed.rows[firstMessageRowId]).toEqual(
      message({
        position: 5,
        revision: 12,
        state: 'settled',
        content: [{ type: 'text', text: 'ab' }],
      }),
    );
  });
});
