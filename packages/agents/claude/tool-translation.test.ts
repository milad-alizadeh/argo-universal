import { expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import { mapAll, feedChanges, foldRows } from './mocks/mapping';
import { edits } from './mocks/sdk-tools';
it('maps the edits and the command onto Tool call rows', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  const tools = rows.filter(
    (row): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
      row.sessionUpdate === 'tool_call_update',
  );
  expect(tools).toEqual([
    expect.objectContaining({
      name: 'Write',
      kind: 'edit',
      status: 'completed',
      locations: [{ path: '/project/notes.md' }],
      content: [
        {
          type: 'diff',
          changes: [
            {
              operation: 'add',
              path: '/project/notes.md',
              newText: expect.stringContaining('# Todo'),
            },
          ],
        },
      ],
    }),
    expect.objectContaining({
      name: 'Read',
      kind: 'read',
      status: 'completed',
      locations: [{ path: '/project/hello.txt' }],
      content: [
        { type: 'content', content: { type: 'text', text: 'hello world\n' } },
      ],
    }),
    expect.objectContaining({
      name: 'Edit',
      kind: 'edit',
      status: 'completed',
      content: [
        {
          type: 'diff',
          changes: [
            {
              operation: 'modify',
              path: '/project/hello.txt',
              oldText: 'hello world',
              newText: 'hello Argo',
            },
          ],
        },
      ],
    }),
    expect.objectContaining({
      name: 'Bash',
      kind: 'execute',
      status: 'completed',
      title: 'Show hello.txt and short git status',
      content: [
        {
          type: 'terminal',
          command: 'cat hello.txt && git status --short',
          output: 'hello Argo\n M hello.txt\n?? notes.md',
        },
      ],
    }),
  ]);
});
it('gives text rows message.id#blockIndex, the same with or without streaming', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  const firstMessage = messages.find(
    (message): message is Extract<VendorMessage, { type: 'assistant' }> =>
      message.type === 'assistant',
  );
  expect(rows[0]?.id).toBe(`${firstMessage?.message.id}#0`);

  const recordsOnly = mapAll(
    messages.filter(
      (message): message is Exclude<VendorMessage, { type: 'stream_event' }> =>
        message.type !== 'stream_event',
    ),
  );
  expect(foldRows(feedChanges(recordsOnly.events))).toEqual(rows);
});
