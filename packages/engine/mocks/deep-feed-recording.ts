import { writeFileSync } from 'node:fs';
import type { SessionUpdate } from '@repo/contracts';
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

async function completedTurn(
  host: Host,
  sessionId: string,
  index: number,
): Promise<void> {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: `Continue the conversation ${index}.` }],
  });
  await waitForAcpSessionIdle(host, sessionId);
}

async function fillHistory(host: Host, sessionId: string): Promise<void> {
  await waitForAcpSessionIdle(host, sessionId);

  for (let index = 0; index < 53; index += 1)
    await completedTurn(host, sessionId, index);

  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: activeMessage }],
  });
}

const tailPage = (
  host: Host,
  sessionId: string,
): ReturnType<Host['caller']['feed']['page']> =>
  host.caller.feed.page({ sessionId, direction: 'tail', limit: 200 });

async function olderRows(
  host: Host,
  sessionId: string,
  page: { cursor: number; epoch: number },
): Promise<SessionUpdate[]> {
  const result = await host.caller.feed.page({
    sessionId,
    direction: 'before',
    ...page,
    limit: 200,
  });

  return result.rows;
}

async function capturedRows(
  host: Host,
  sessionId: string,
): Promise<SessionUpdate[]> {
  const tail = await tailPage(host, sessionId);

  if (tail.startCursor === null) return tail.rows;

  const earlier = await olderRows(host, sessionId, {
    cursor: tail.startCursor,
    epoch: tail.epoch,
  });

  return [...earlier, ...tail.rows];
}

async function recordHistory(): Promise<SessionUpdate[]> {
  const host = await startHost();

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: firstMessage }],
  });

  await fillHistory(host, session.sessionId);

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
