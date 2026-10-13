import type { FeedChange } from '@repo/contracts';
import { type Feed } from '../src/feed';
import {
  message,
  command,
  update,
  feedWith,
  firstMessageRowId,
  messageTextField,
} from './feed-change-inputs';

interface Rejected {
  name: string;
  feed: Feed;
  change: FeedChange;
  rejection: RegExp;
}

export const rejected: Rejected[] = [
  {
    name: 'an upsert whose payload breaks its kind',
    feed: feedWith(),
    change: {
      type: 'upsert',
      update: update(
        command({
          content: [
            {
              type: 'terminal',
              command: 'pnpm test',
              output: 'ok\n',
              exitStatus: { exitCode: 1.5 },
            },
          ],
        }),
      ),
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
