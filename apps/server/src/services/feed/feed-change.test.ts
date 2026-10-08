import type {
  AgentMessage,
  FeedChange,
  FeedUpdate,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  applyFeedChange,
  type Feed,
  type FeedStreamEvent,
} from './feed-change';

const firstMessageRowId = 'message-1#0';
const messageTextField = 'content.0.text';

const message = (overrides: Partial<AgentMessage> = {}): AgentMessage => ({
  id: firstMessageRowId,
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
  rows: Object.fromEntries(
    rows.map((row): [string, SessionUpdate] => [row.id, row]),
  ),
});

const update = (row: SessionUpdate): FeedUpdate => {
  const { sessionId, position, revision, turnId, ...rest } = row;
  return rest as FeedUpdate;
};

interface Accepted {
  name: string;
  rows: SessionUpdate[];
  change: FeedChange;
  turnId?: string | null;
  // The changed row; the change takes revision 9.
  rowAfter: SessionUpdate;
  // Defaults to an upsert of `rowAfter`.
  streamEvent?: FeedStreamEvent;
}

const accepted: Accepted[] = [
  {
    name: 'an upsert of a new row takes the next position and revision',
    rows: [],
    change: {
      type: 'upsert',
      update: update(message({ content: [{ type: 'text', text: '' }] })),
    },
    turnId: 'turn-2',
    rowAfter: message({
      position: 5,
      revision: 9,
      turnId: 'turn-2',
      content: [{ type: 'text', text: '' }],
    }),
  },
  {
    name: 'an upsert of an open row replaces it and keeps its position and Turn',
    rows: [message()],
    change: {
      type: 'upsert',
      update: update(message({ content: [{ type: 'text', text: 'Hi' }] })),
    },
    turnId: 'turn-2',
    rowAfter: message({ revision: 9, content: [{ type: 'text', text: 'Hi' }] }),
  },
  {
    name: 'an upsert with state settled settles the row',
    rows: [message()],
    change: { type: 'upsert', update: update(message({ state: 'settled' })) },
    rowAfter: message({ revision: 9, state: 'settled' }),
  },
  {
    name: 'a row made outside a Turn has no Turn',
    rows: [],
    change: { type: 'upsert', update: update(message({ state: 'settled' })) },
    turnId: null,
    rowAfter: message({
      position: 5,
      revision: 9,
      turnId: null,
      state: 'settled',
    }),
  },
  {
    name: 'an append adds text at the offset of the string it names',
    rows: [message()],
    change: {
      type: 'append',
      id: firstMessageRowId,
      field: messageTextField,
      text: ', world',
    },
    rowAfter: message({
      revision: 9,
      content: [{ type: 'text', text: 'Hello, world' }],
    }),
    streamEvent: {
      type: 'row.append',
      rev: 9,
      id: firstMessageRowId,
      field: messageTextField,
      off: 5,
      text: ', world',
    },
  },
  {
    name: 'an append reaches terminal output inside Tool call content',
    rows: [message(), command()],
    change: {
      type: 'append',
      id: 'tool-1',
      field: 'content.0.output',
      text: 'done\n',
    },
    rowAfter: command({
      revision: 9,
      content: [
        { type: 'terminal', command: 'pnpm test', output: 'ok\ndone\n' },
      ],
    }),
    streamEvent: {
      type: 'row.append',
      rev: 9,
      id: 'tool-1',
      field: 'content.0.output',
      off: 3,
      text: 'done\n',
    },
  },
  {
    name: 'a patch replaces top-level fields',
    rows: [command()],
    change: { type: 'patch', id: 'tool-1', set: { status: 'completed' } },
    rowAfter: command({ revision: 9, status: 'completed' }),
    streamEvent: {
      type: 'row.patch',
      rev: 9,
      id: 'tool-1',
      set: { status: 'completed' },
    },
  },
  {
    name: 'a patch with state settled settles the row',
    rows: [command()],
    change: {
      type: 'patch',
      id: 'tool-1',
      set: { status: 'failed', state: 'settled' },
    },
    rowAfter: command({ revision: 9, status: 'failed', state: 'settled' }),
    streamEvent: {
      type: 'row.patch',
      rev: 9,
      id: 'tool-1',
      set: { status: 'failed', state: 'settled' },
    },
  },
  {
    name: 'a patch to a settled row, which keeps its place',
    rows: [message({ state: 'settled' })],
    change: {
      type: 'patch',
      id: firstMessageRowId,
      set: { messageId: 'plan-1' },
    },
    turnId: 'turn-2',
    rowAfter: message({ revision: 9, state: 'settled', messageId: 'plan-1' }),
    streamEvent: {
      type: 'row.patch',
      rev: 9,
      id: firstMessageRowId,
      set: { messageId: 'plan-1' },
    },
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
      update: update(command({ id: firstMessageRowId })),
    },
    rejection: /^row message-1#0 is agent_message, not tool_call_update$/,
  },
  {
    name: 'an append to a row the feed does not hold',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: 'message-2#0',
      field: messageTextField,
      text: 'x',
    },
    rejection: /^no row message-2#0$/,
  },
  {
    name: 'an append to a path that is not a string',
    feed: feedWith(message()),
    change: {
      type: 'append',
      id: firstMessageRowId,
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
      id: firstMessageRowId,
      field: 'content.1.text',
      text: 'x',
    },
    rejection: /^content\.1\.text of row message-1#0 is not a string$/,
  },
  {
    name: 'an append to an envelope field',
    feed: feedWith(message()),
    change: { type: 'append', id: firstMessageRowId, field: 'id', text: 'x' },
    rejection: /^id of row message-1#0 is set by the Feed$/,
  },
  {
    name: 'a patch to a row the feed does not hold',
    feed: feedWith(),
    change: { type: 'patch', id: 'tool-1', set: { status: 'completed' } },
    rejection: /^no row tool-1$/,
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
        streamEvent: streamEvent ?? {
          type: 'row.upsert',
          rev: 9,
          row: rowAfter,
        },
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
