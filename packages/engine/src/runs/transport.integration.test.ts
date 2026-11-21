import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createFakeTerminals } from '#mocks/fake-terminals';

const name = 'web';
const web = { name, command: 'pnpm dev', ready: { pattern: 'Local:' } };

async function configure(checkout: string): Promise<void> {
  await mkdir(join(checkout, '.argo'), { recursive: true });
  await writeFile(
    join(checkout, '.argo', 'run.json'),
    JSON.stringify({ configurations: [web] }),
  );
}

async function startProject() {
  const terminals = createFakeTerminals();
  const { caller } = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });
  onTestFinished(terminals.end);
  const { sessionId } = await caller.session.new(emptySessionInput);
  const { checkout } = await caller.session.get({ sessionId });
  await configure(checkout.path);

  return { caller, terminals, sessionId };
}

it('updates both Sessions on a Checkout as its Run starts, becomes ready, and stops', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const other = await caller.session.new(emptySessionInput);
  const events = await caller.run.watchStatus(other);
  const statuses = events[Symbol.asyncIterator]();
  onTestFinished(async () => {
    await statuses.return?.();
  });

  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'stopped', port: null }] },
  });

  const starting = caller.run.start({ sessionId, name });
  const terminal = await terminals.next();
  const port = terminal.launch.port;
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'starting', port }] },
  });

  terminal.print('Local:\r\n');
  await expect(starting).resolves.toMatchObject({ ready: true, port });
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'ready', port }] },
  });

  await caller.run.stop({ sessionId, name });
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'stopped' }] },
  });
});

it('replays recorded Terminal bytes, streams new bytes and resumes at a saved cursor', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const target = { sessionId, name };
  const started = caller.run.start(target);
  const terminal = await terminals.next();
  terminal.print('Local:\r\n\u001b[31m🚀\u001b[0m');
  await started;

  const output = (await caller.run.output(target))[Symbol.asyncIterator]();
  onTestFinished(async () => {
    await output.return?.();
  });

  const replay = await output.next();
  expect(replay.done).toBe(false);
  expect(Buffer.from(replay.value.data, 'base64').toString('utf8')).toBe(
    'Local:\r\n\u001b[31m🚀\u001b[0m',
  );
  expect(replay.value.cursor.offset).toBe(21);

  const live = output.next();
  terminal.print('\r\nReloaded');
  const next = await live;
  expect(next.done).toBe(false);
  expect(Buffer.from(next.value.data, 'base64').toString('utf8')).toBe(
    '\r\nReloaded',
  );
  await output.return?.();

  terminal.print('\r\nWhile away');
  const reopened = (
    await caller.run.output({ ...target, cursor: next.value.cursor })
  )[Symbol.asyncIterator]();
  onTestFinished(async () => {
    await reopened.return?.();
  });

  const missed = await reopened.next();
  expect(missed.done).toBe(false);
  expect(Buffer.from(missed.value.data, 'base64').toString('utf8')).toBe(
    '\r\nWhile away',
  );
  expect(missed.value.cursor.runId).toBe(next.value.cursor.runId);
});
