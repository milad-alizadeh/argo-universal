import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { createFakeTerminals, type FakeTerminal } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

const web = { name: 'web', command: 'pnpm dev', ready: { pattern: 'Local:' } };

const archiveUndoMs = 300;

const removalTimeout = 20_000;

const configure = async (directory: string): Promise<void> => {
  await mkdir(join(directory, '.argo'), { recursive: true });
  await writeFile(
    join(directory, '.argo', 'run.json'),
    JSON.stringify({ configurations: [web] }),
  );
};

type Engine = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  terminals: ReturnType<typeof createFakeTerminals>;
  call: (
    id: 'run.start' | 'run.stop' | 'run.status',
    sessionId: string,
  ) => ReturnType<typeof runOperation>;
};

const runStatus = 'run.status';

async function startEngine(): Promise<Engine> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
    archiveUndoMs,
  });

  onTestFinished(terminals.end);
  const { operations } = await operationCaller(host);

  const call: Engine['call'] = (id, sessionId) =>
    runOperation(operations, {
      id,
      params: id === runStatus ? { sessionId } : { sessionId, name: 'web' },
    });

  return { host, terminals, call };
}

const startReady = async (
  engine: Engine,
  sessionId: string,
): Promise<FakeTerminal> => {
  const started = engine.call('run.start', sessionId);
  const terminal = await engine.terminals.next();
  terminal.print('Local:');
  await started;

  return terminal;
};

it('ends the Runs of a Checkout when archiving removes it', async () => {
  const engine = await startEngine();
  const created = await promptedArchiveSession(engine.host);
  await configure(created.path);
  const terminal = await startReady(engine, created.sessionId);

  // The Run Configurations file is uncommitted work, so Archive asks first.
  const { checkoutConfirmation } = await engine.host.caller.session.archive({
    sessionId: created.sessionId,
  });

  expect(checkoutConfirmation).toBeDefined();
  expect(terminal.stopped).toBe(false);

  await engine.host.caller.session.archive({
    sessionId: created.sessionId,
    checkoutApproval: checkoutConfirmation?.fingerprint,
  });

  await expect
    .poll(() => existsSync(created.path), { timeout: removalTimeout })
    .toBe(false);
  expect(terminal.stopped).toBe(true);
}, 40_000);

it('leaves Runs of a Checkout that archiving keeps', async () => {
  const engine = await startEngine();
  const created = await promptedArchiveSession(engine.host);
  await configure(created.path);
  const terminal = await startReady(engine, created.sessionId);
  await engine.host.caller.project.update({
    projectId: 'project-1',
    deleteWorktreeOnArchive: false,
  });

  await engine.host.caller.session.archive({ sessionId: created.sessionId });
  await new Promise((resolve) => setTimeout(resolve, archiveUndoMs * 4));

  expect(existsSync(created.path)).toBe(true);
  expect(terminal.stopped).toBe(false);
}, 40_000);

it('leaves the Runs of the main checkout running when a Session on it is archived', async () => {
  const engine = await startEngine();
  const first = await promptedArchiveSession(engine.host, { type: 'main' });
  const second = await engine.host.caller.session.new(emptySessionInput);
  await configure(first.path);
  const terminal = await startReady(engine, first.sessionId);

  await engine.host.caller.session.archive({ sessionId: first.sessionId });
  await new Promise((resolve) => setTimeout(resolve, archiveUndoMs * 4));

  expect(terminal.stopped).toBe(false);
  expect(await engine.call(runStatus, second.sessionId)).toMatchObject({
    configurations: [{ name: 'web', status: 'ready' }],
  });
}, 40_000);

it('lets either of two Sessions on the main checkout see and stop the one Run', async () => {
  const engine = await startEngine();
  const first = await engine.host.caller.session.new(emptySessionInput);
  const second = await engine.host.caller.session.new(emptySessionInput);
  const project = (await engine.host.caller.project.list())[0];
  await configure(project?.path ?? '');
  const terminal = await startReady(engine, first.sessionId);

  expect(await engine.call(runStatus, second.sessionId)).toMatchObject({
    configurations: [{ name: 'web', status: 'ready' }],
  });

  await engine.call('run.stop', second.sessionId);

  expect(terminal.stopped).toBe(true);
  expect(await engine.call(runStatus, first.sessionId)).toMatchObject({
    configurations: [{ name: 'web', status: 'stopped' }],
  });
  expect(engine.terminals.started).toHaveLength(1);
});
