import { expect, it } from 'vitest';
import { mapAll, feedChanges, foldRows } from './mocks/mapping';
import { edits } from './mocks/sdk-tools';
it('settles a thought, four Tool calls and the answer, in order', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  expect(
    rows.map(
      (
        row,
      ): (
        | 'agent_message'
        | 'agent_thought'
        | 'compaction_update'
        | 'notice'
        | 'open'
        | 'plan_update'
        | 'settled'
        | 'subagent_update'
        | 'task_update'
        | 'tool_call_update'
        | 'user_message'
      )[] => [row.sessionUpdate, row.state],
    ),
  ).toEqual([
    ['agent_thought', 'settled'],
    ['tool_call_update', 'settled'],
    ['tool_call_update', 'settled'],
    ['tool_call_update', 'settled'],
    ['tool_call_update', 'settled'],
    ['agent_message', 'settled'],
  ]);
  expect(rows[0]).toMatchObject({
    content: [
      {
        type: 'text',
        text: expect.stringContaining('read hello.txt before editing'),
      },
    ],
  });
  expect(rows.at(-1)).toMatchObject({
    content: [{ type: 'text', text: expect.stringContaining('hello Argo') }],
  });
});
