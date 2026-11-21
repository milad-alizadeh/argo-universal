import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const handoffCommand = '/$handoff';

const documentText = '# Continue the work\n\n## Suggested skills\n\n- tdd';

function documentPath(request: PromptRequest | undefined): string {
  const block = request?.prompt[0];

  if (block?.type !== 'text') throw new Error('Expected a text Prompt');
  const quotedPath = block.text.match(/"(?:[^"\\]|\\.)*"/)?.[0];
  const path: unknown = quotedPath && JSON.parse(quotedPath);

  if (typeof path !== 'string')
    throw new Error('Expected the Handoff Prompt to name its document');

  return path;
}

it('opens a fresh Session in the source Checkout after the Handoff document exists', async () => {
  const requests: PromptRequest[] = [];
  const entered = Promise.withResolvers<void>();
  const written = Promise.withResolvers<void>();

  const { caller } = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          prompt: handoffCommand,
          requests,
          steps: [{ type: 'gate', waitFor: written.promise, entered }],
        },
        { prompt: 'Read the handoff document', requests },
      ],
    },
  });

  const source = await caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  const { checkout } = await caller.session.get(source);
  const uncommitted = join(checkout.path, 'uncommitted.txt');
  await writeFile(uncommitted, 'Work in progress');

  const opening = caller.session.handoff(source);
  void opening.catch(() => {});

  try {
    await entered.promise;
    const path = documentPath(requests[0]);
    onTestFinished(() => rm(dirname(path), { recursive: true, force: true }));
    expect(requests[0]?.prompt).toMatchObject([
      { text: expect.stringMatching(/^\/\$handoff\b/) },
    ]);
    const before = await caller.session.list({ archived: false });
    expect(before.sessions.map(({ sessionId }) => sessionId)).toEqual([
      source.sessionId,
    ]);

    await writeFile(path, documentText);
    written.resolve();

    const next = await opening;
    const fresh = await caller.session.get(next);
    expect(next.sessionId).not.toBe(source.sessionId);
    expect(fresh.checkout).toMatchObject({
      type: 'starter',
      path: checkout.path,
    });
    expect(
      await readFile(join(fresh.checkout.path, 'uncommitted.txt'), 'utf8'),
    ).toBe('Work in progress');
    expect(await readFile(path, 'utf8')).toBe(documentText);
    const feed = await caller.feed.page({ ...next, direction: 'tail' });
    expect(feed.rows).toContainEqual(
      expect.objectContaining({
        content: [
          { type: 'text', text: expect.stringContaining(JSON.stringify(path)) },
        ],
      }),
    );
  } finally {
    written.resolve();
  }
});

it('reports a missing Handoff document in the source Feed', async () => {
  const { caller } = await startAcpEngine({ steps: [] });
  const source = await caller.session.new(emptySessionInput);
  await expect(caller.session.handoff(source)).rejects.toThrow(
    'did not write a handoff document',
  );
  const feed = await caller.feed.page({ ...source, direction: 'tail' });
  expect(feed.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'notice',
      title: 'Handoff failed',
    }),
  );
  const after = await caller.session.list({ archived: false });
  expect(after.sessions.map(({ sessionId }) => sessionId)).toEqual([
    source.sessionId,
  ]);
});
