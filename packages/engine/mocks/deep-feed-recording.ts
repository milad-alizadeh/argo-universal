import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

const firstMessage = 'The first message in the deep Feed.';
const activeMessage = 'The current active turn.';
type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const startHost = (): Promise<Host> =>
  startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        ...Array.from({ length: 54 }, () => ({ steps: [] })),
        { steps: [{ type: 'wait-for-cancel' }] },
      ],
    },
  });

async function fillHistory(
  host: Host,
  session: { sessionId: string },
): Promise<void> {
  await waitForAcpSessionIdle(host, session.sessionId);
  for (let index = 0; index < 53; index += 1) {
    await host.caller.session.prompt({
      ...session,
      prompt: [{ type: 'text', text: `Continue the conversation ${index}.` }],
    });
    await waitForAcpSessionIdle(host, session.sessionId);
  }

  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: activeMessage }],
  });
}

async function capturedRows(host: Host, sessionId: string) {
  const tail = await host.caller.feed.page({
    sessionId,
    direction: 'tail',
    limit: 200,
  });
  const earlier = await host.caller.feed.page({
    sessionId,
    direction: 'before',
    cursor: tail.startCursor,
    epoch: tail.epoch,
    limit: 200,
  });

  return [...earlier.rows, ...tail.rows];
}

async function recordHistory() {
  const host = await startHost();
  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: firstMessage }],
  });

  await fillHistory(host, session);
  return capturedRows(host, session.sessionId);
}

// Distinct real turns keep the recorded history scrollable across more than 100 pages.
it('records more than one hundred Feed pages', async () => {
  const rows = await recordHistory();

  expect(rows.length).toBeGreaterThan(105);
  expect(JSON.stringify(rows.at(-1))).toContain(activeMessage);
  expect(JSON.stringify(rows[0])).toContain(firstMessage);
  writeFileSync(
    new URL('../../../mocks/app/deep-feed-recording.json', import.meta.url),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
}, 60_000);
