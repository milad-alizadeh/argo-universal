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
