import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

// Distinct real turns keep the recorded history scrollable across more than 100 pages.
it('records more than one hundred Feed pages', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        ...Array.from({ length: 54 }, () => ({ steps: [] })),
        { steps: [{ type: 'wait-for-cancel' }] },
      ],
    },
  });
  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'The first message in the deep Feed.' }],
  });

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
    prompt: [{ type: 'text', text: 'The current active turn.' }],
  });

  const tail = await host.caller.feed.page({
    sessionId: session.sessionId,
    direction: 'tail',
    limit: 200,
  });

  const earlier = await host.caller.feed.page({
    sessionId: session.sessionId,
    direction: 'before',
    cursor: tail.startCursor,
    epoch: tail.epoch,
    limit: 200,
  });
  const rows = [...earlier.rows, ...tail.rows];

  expect(rows.length).toBeGreaterThan(105);
  expect(JSON.stringify(rows.at(-1))).toContain('The current active turn.');
  expect(JSON.stringify(rows[0])).toContain(
    'The first message in the deep Feed.',
  );
  writeFileSync(
    new URL('../../../mocks/app/deep-feed-recording.json', import.meta.url),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
}, 60_000);
