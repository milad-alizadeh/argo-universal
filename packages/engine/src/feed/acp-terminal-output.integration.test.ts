import { expect, it } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';
import {
  completedTerminal,
  readCommand,
  terminalCommand,
  terminalId,
  terminalMarker,
  terminalUpdate,
} from '#mocks/acp-terminal-output';

it('command output delivered at completion stays readable in the Feed after the Session closes', async () => {
  const { host, sessionId } = await openAcpFeedSession(completedTerminal);

  const expected = {
    sessionUpdate: terminalUpdate,
    toolCallId: terminalId,
    status: 'completed',
    content: [
      {
        type: 'terminal',
        command: terminalCommand,
        cwd: '/project',
        output: terminalMarker,
        exitStatus: { exitCode: 0 },
      },
    ],
  };

  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  const row = page.rows.find(
    (candidate) => candidate.sessionUpdate === terminalUpdate,
  );

  expect(row).toMatchObject(expected);
  expect(row?._meta?.acp).not.toHaveProperty('terminal_output_delta');
  await host.caller.session.close({ sessionId });

  const stored = await host
    .createCaller()
    .feed.page({ sessionId, direction: 'tail' });

  expect(
    stored.rows.find((candidate) => candidate.sessionUpdate === terminalUpdate),
  ).toMatchObject(expected);
});

it('read commands without terminal resources retain the adapter output chunks', async () => {
  const { host, sessionId } = await openAcpFeedSession(readCommand);
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  expect(page.rows).toContainEqual(
    expect.objectContaining({
      toolCallId: 'read-a',
      content: [
        expect.objectContaining({
          type: 'content',
          content: { type: 'text', text: 'source\n' },
        }),
      ],
    }),
  );
});
