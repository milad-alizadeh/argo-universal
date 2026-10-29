import { writeFileSync } from 'node:fs';
import type { SessionUpdate, UserMessage } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

// Run by `node tools/record-user-messages.mts`, never by `vitest run`: it rewrites the shared recording.
const recordingFile = new URL(
  '../../../mocks/app/user-message-recordings.json',
  import.meta.url,
);

const markdownPrompt = [
  'Please review the **Composer** change with *care*, ~~skip the docs~~ and check `draftPrompt`:',
  '',
  '1. Read the [ADR-0023](https://example.com/adr/0023) notes',
  '2. Run the tests',
  '    - unit',
  '    - e2e',
  '',
  '> The stored text stays exactly as typed.',
  '',
  '```ts',
  'const text = draft.text;',
  '```',
].join('\n');

const recordPrompt = async (
  agent: string,
  text: string,
): Promise<UserMessage> => {
  const host = await startAcpEngine({ steps: [] }, undefined, agent);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    agent,
    prompt: [{ type: 'text', text }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  return readRecordedPrompt(host, created.sessionId, agent);
};

const readRecordedPrompt = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
  agent: string,
): Promise<UserMessage> => {
  const page = await host.caller.feed.page({
    sessionId: sessionId,
    direction: 'tail',
    limit: 200,
  });

  const row = page.rows.find(isUserMessage);

  if (!row) throw new Error(`No user message stored for ${agent}`);

  return row;
};

const isUserMessage = (row: SessionUpdate): row is UserMessage =>
  row.sessionUpdate === 'user_message';

it('records the markdown prompt each Agent stores', async () => {
  const recordings = [];

  for (const agent of ['agent-1', 'agent-2'])
    recordings.push({
      agent,
      recording: 'markdown-prompt',
      row: await recordPrompt(agent, markdownPrompt),
    });
  expect(recordings.map(({ row }) => row.content)).toEqual([
    [{ type: 'text', text: markdownPrompt }],
    [{ type: 'text', text: markdownPrompt }],
  ]);
  writeFileSync(recordingFile, `${JSON.stringify(recordings, null, 2)}\n`);
});
