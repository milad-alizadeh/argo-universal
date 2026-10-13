import type { Accepted } from './feed-change-inputs';
import {
  message,
  command,
  update,
  firstMessageRowId,
  messageTextField,
} from './feed-change-inputs';
export const accepted: Accepted[] = [
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
