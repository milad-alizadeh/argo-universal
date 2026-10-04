import type {
  AgentMessage,
  FeedChange,
  FeedUpdate,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { applyFeedChange, type Feed } from './feed-change';

const message = (overrides: Partial<AgentMessage> = {}): AgentMessage => ({
  id: 'message-1#0',
  sessionId: 'session-1',
  position: 3,
  revision: 7,
  turnId: 'turn-1',
  state: 'open',
  sessionUpdate: 'agent_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Hello' }],
  ...overrides,
});

const command = (overrides: Partial<ToolCallUpdate> = {}): ToolCallUpdate => ({
  id: 'tool-1',
  sessionId: 'session-1',
  position: 4,
  revision: 8,
  turnId: 'turn-1',
  state: 'open',
  sessionUpdate: 'tool_call_update',
  toolCallId: 'tool-1',
  title: 'pnpm test',
  kind: 'execute',
  status: 'in_progress',
  content: [{ type: 'terminal', command: 'pnpm test', output: 'ok\n' }],
  ...overrides,
});

const feedWith = (...rows: SessionUpdate[]): Feed => ({
  sessionId: 'session-1',
  maxRevision: 8,
  nextPosition: 5,
  rows: Object.fromEntries(rows.map((row) => [row.id, row])),
});

const update = (row: SessionUpdate): FeedUpdate => {
  const { sessionId, position, revision, turnId, ...rest } = row;
  return rest as FeedUpdate;
};

interface Accepted {
  name: string;
  feed: Feed;
  change: FeedChange;
  turnId: string | null;
  feedAfter: Feed;
  streamEvents: unknown[];
}

const accepted: Accepted[] = [
  {
    name: 'an upsert of a new row takes the next position and revision',
    feed: feedWith(),
    change: {
      type: 'upsert',
      update: update(message({ content: [{ type: 'text', text: '' }] })),
    },
    turnId: 'turn-2',
    feedAfter: {
      ...feedWith(
        message({
          position: 5,
          revision: 9,
          turnId: 'turn-2',
          content: [{ type: 'text', text: '' }],
        }),
      ),
      maxRevision: 9,
      nextPosition: 6,
    },
    streamEvents: [
      {
        type: 'row.upsert',
        rev: 9,
        row: message({
          position: 5,
          revision: 9,
          turnId: 'turn-2',
          content: [{ type: 'text', text: '' }],
        }),
      },
    ],
  },
  {
    name: 'an upsert of an open row replaces it and keeps its position and Turn',
    feed: feedWith(message()),
    change: {
      type: 'upsert',
      update: update(message({ content: [{ type: 'text', text: 'Hi' }] })),
    },
    turnId: 'turn-2',
    feedAfter: {
      ...feedWith(
        message({ revision: 9, content: [{ type: 'text', text: 'Hi' }] }),
      ),
      maxRevision: 9,
    },
    streamEvents: [
      {
        type: 'row.upsert',
        rev: 9,
        row: message({ revision: 9, content: [{ type: 'text', text: 'Hi' }] }),
      },
    ],
  },
  {
    name: 'an upsert with state settled settles the row',
    feed: feedWith(message()),
    change: {
      type: 'upsert',
      update: update(message({ state: 'settled' })),
    },
    turnId: 'turn-1',
    feedAfter: {
      ...feedWith(message({ revision: 9, state: 'settled' })),
      maxRevision: 9,
    },
    streamEvents: [
      {
        type: 'row.upsert',
        rev: 9,
        row: message({ revision: 9, state: 'settled' }),
      },
    ],
  },
  {
    name: 'a row made outside a Turn has no Turn',
    feed: feedWith(),
    change: {
      type: 'upsert',
      update: update(message({ state: 'settled' })),
    },
    turnId: null,
    feedAfter: {
      ...feedWith(
        message({ position: 5, revision: 9, turnId: null, state: 'settled' }),
      ),
      maxRevision: 9,
      nextPosition: 6,
    },
    streamEvents: [
      {
        type: 'row.upsert',
        rev: 9,
        row: message({
          position: 5,
          revision: 9,
          turnId: null,
          state: 'settled',
        }),
      },
    ],
  },
  {
    name: 'an append adds text at the offset of the string it names',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: 'message-1#0',
      field: 'content.0.text',
      text: ', world',
    },
    turnId: 'turn-1',
    feedAfter: {
      ...feedWith(
        message({
          revision: 9,
          content: [{ type: 'text', text: 'Hello, world' }],
        }),
      ),
      maxRevision: 9,
    },
    streamEvents: [
      {
        type: 'row.append',
        rev: 9,
        id: 'message-1#0',
        field: 'content.0.text',
        off: 5,
        text: ', world',
      },
    ],
  },
  {
    name: 'an append reaches terminal output inside Tool call content',
    feed: feedWith(message(), command()),
    change: {
      type: 'append',
      id: 'tool-1',
      field: 'content.0.output',
      text: 'done\n',
    },
    turnId: 'turn-1',
    feedAfter: {
      ...feedWith(
        message(),
        command({
          revision: 9,
          content: [
            { type: 'terminal', command: 'pnpm test', output: 'ok\ndone\n' },
          ],
        }),
      ),
      maxRevision: 9,
    },
    streamEvents: [
      {
        type: 'row.append',
        rev: 9,
        id: 'tool-1',
        field: 'content.0.output',
        off: 3,
        text: 'done\n',
      },
    ],
  },
  {
    name: 'a patch replaces top-level fields',
    feed: feedWith(command()),
    change: { type: 'patch', id: 'tool-1', set: { status: 'completed' } },
    turnId: 'turn-1',
    feedAfter: {
      ...feedWith(command({ revision: 9, status: 'completed' })),
      maxRevision: 9,
    },
    streamEvents: [
      { type: 'row.patch', rev: 9, id: 'tool-1', set: { status: 'completed' } },
    ],
  },
  {
    name: 'a patch with state settled settles the row',
    feed: feedWith(command()),
    change: {
      type: 'patch',
      id: 'tool-1',
      set: { status: 'failed', state: 'settled' },
    },
    turnId: 'turn-1',
    feedAfter: {
      ...feedWith(command({ revision: 9, status: 'failed', state: 'settled' })),
      maxRevision: 9,
    },
    streamEvents: [
      {
        type: 'row.patch',
        rev: 9,
        id: 'tool-1',
        set: { status: 'failed', state: 'settled' },
      },
    ],
  },
];

interface Rejected {
  name: string;
  feed: Feed;
  change: FeedChange;
  rejection: RegExp;
}

const rejected: Rejected[] = [
  {
    name: 'an upsert whose payload breaks its kind',
    feed: feedWith(),
    change: {
      type: 'upsert',
      update: { ...update(command()), status: 'stuck' } as never,
    },
    rejection: /^row tool-1 does not match tool_call_update: /,
  },
  {
    name: 'an upsert that changes the kind of a row',
    feed: feedWith(message()),
    change: {
      type: 'upsert',
      update: update(command({ id: 'message-1#0' })),
    },
    rejection: /^row message-1#0 is agent_message, not tool_call_update$/,
  },
  {
    name: 'a change to a settled row',
    feed: feedWith(message({ state: 'settled' })),
    change: { type: 'upsert', update: update(message()) },
    rejection: /^row message-1#0 is settled$/,
  },
  {
    name: 'an append to a row the feed does not hold',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: 'message-2#0',
      field: 'content.0.text',
      text: 'x',
    },
    rejection: /^no open row message-2#0$/,
  },
  {
    name: 'an append to a path that is not a string',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: 'message-1#0',
      field: 'content.0',
      text: 'x',
    },
    rejection: /^content\.0 of row message-1#0 is not a string$/,
  },
  {
    name: 'an append to a path that does not exist',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: 'message-1#0',
      field: 'content.1.text',
      text: 'x',
    },
    rejection: /^content\.1\.text of row message-1#0 is not a string$/,
  },
  {
    name: 'an append to an envelope field',
    feed: feedWith(message()),
    change: { type: 'append', id: 'message-1#0', field: 'id', text: 'x' },
    rejection: /^id of row message-1#0 is set by the Feed$/,
  },
  {
    name: 'a patch to a row the feed does not hold',
    feed: feedWith(),
    change: { type: 'patch', id: 'tool-1', set: { status: 'completed' } },
    rejection: /^no open row tool-1$/,
  },
  {
    name: 'a patch of an envelope field',
    feed: feedWith(command()),
    change: { type: 'patch', id: 'tool-1', set: { position: 0 } },
    rejection: /^position of row tool-1 is set by the Feed$/,
  },
  {
    name: 'a patch that breaks the kind of a row',
    feed: feedWith(command()),
    change: { type: 'patch', id: 'tool-1', set: { status: 'stuck' } },
    rejection: /^row tool-1 does not match tool_call_update: /,
  },
];

describe('applyFeedChange', () => {
  it.each(accepted)(
    '$name',
    ({ feed, change, turnId, feedAfter, streamEvents }) => {
      expect(applyFeedChange(feed, change, turnId)).toEqual({
        feed: feedAfter,
        streamEvents,
        rejection: null,
      });
    },
  );

  it.each(rejected)('rejects $name', ({ feed, change, rejection }) => {
    const result = applyFeedChange(feed, change, 'turn-1');

    expect(result.feed).toBe(feed);
    expect(result.streamEvents).toEqual([]);
    expect(result.rejection).toMatch(rejection);
  });

  it('raises the revision by one for each change', () => {
    const changes: FeedChange[] = [
      {
        type: 'upsert',
        update: update(message({ content: [{ type: 'text', text: '' }] })),
      },
      { type: 'append', id: 'message-1#0', field: 'content.0.text', text: 'a' },
      { type: 'append', id: 'message-1#0', field: 'content.0.text', text: 'b' },
      { type: 'patch', id: 'message-1#0', set: { state: 'settled' } },
    ];

    let feed = feedWith();
    const revisions: number[] = [];
    for (const change of changes) {
      const result = applyFeedChange(feed, change, 'turn-1');
      feed = result.feed;
      revisions.push(...result.streamEvents.map((event) => event.rev));
    }

    expect(revisions).toEqual([9, 10, 11, 12]);
    expect(feed.rows['message-1#0']).toEqual(
      message({
        position: 5,
        revision: 12,
        state: 'settled',
        content: [{ type: 'text', text: 'ab' }],
      }),
    );
  });
});
