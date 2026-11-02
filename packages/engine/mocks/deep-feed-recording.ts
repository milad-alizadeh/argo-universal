import { writeFileSync } from 'node:fs';
import type { SessionUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';

const steps = Array.from({ length: 105 }, (_, index) => ({
  type: 'update' as const,
  update: {
    sessionUpdate: 'tool_call' as const,
    toolCallId: `deep-tool-${index}`,
    kind: 'other' as const,
    title: `Read item ${index}`,
    status: 'in_progress' as const,
    content: [],
  },
}));

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const rowsOf = async (
  host: Host,
  sessionId: string,
): Promise<SessionUpdate[]> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail', limit: 200 }))
    .rows;

async function waitForLastRow(host: Host, sessionId: string): Promise<void> {
  await expect
    .poll(
      async () =>
        (await rowsOf(host, sessionId)).some(
          (row) =>
            row.sessionUpdate === 'tool_call_update' &&
            row.toolCallId === 'deep-tool-104',
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function capture(): Promise<SessionUpdate[]> {
  const host = await startAcpEngine({
    steps: [...steps, { type: 'wait-for-cancel' }],
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'The first message in the deep Feed.' }],
  });

  await waitForLastRow(host, sessionId);
  const rows = await rowsOf(host, sessionId);

  await host.caller.session.cancel({ sessionId });

  return rows;
}

// A long scripted ACP turn passes through the Engine and its SQL Feed reader.
it('records more than one hundred Feed pages', async () => {
  const rows = await capture();

  expect(rows.length).toBeGreaterThan(105);
  writeFileSync(
    new URL('../../../mocks/app/deep-feed-recording.json', import.meta.url),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
}, 60_000);
