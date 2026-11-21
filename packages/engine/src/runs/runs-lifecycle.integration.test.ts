import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { createFakeTerminals, FakeTerminal } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

const web = { name: 'web', command: 'pnpm dev', ready: { pattern: 'Local:' } };

const archiveUndoMs = 300;

const removalTimeout = 20_000;

const configure = async (
  directory: string,
  options: { port?: number; env?: Record<string, string> } = {},
): Promise<void> => {
  await mkdir(join(directory, '.argo'), { recursive: true });
  await writeFile(
    join(directory, '.argo', 'run.json'),
    JSON.stringify({ configurations: [{ ...web, ...options }] }),
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

async function startEngine(
  beforeAttach?: (terminal: FakeTerminal) => Promise<void>,
): Promise<Engine> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: async (launch) => {
      const terminal = await terminals.spawn(launch);

      if (!(terminal instanceof FakeTerminal))
        throw new Error('The test spawner did not create a fake Terminal');

      await beforeAttach?.(terminal);

      return terminal;
    },
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

async function archiveWithRemoval(
  engine: Engine,
  sessionId: string,
): Promise<void> {
  const { checkoutConfirmation } = await engine.host.caller.session.archive({
    sessionId,
  });

  if (!checkoutConfirmation) throw new Error('No Checkout confirmation');

  await engine.host.caller.session.archive({
    sessionId,
    checkoutApproval: checkoutConfirmation.fingerprint,
  });
}

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

const freePort = async (): Promise<number> => {
  const listener = createServer();

  await new Promise<void>((resolve) =>
    listener.listen(0, '127.0.0.1', resolve),
  );
  const address = listener.address();
  await new Promise<void>((resolve) => listener.close(() => resolve()));

  if (!address || typeof address === 'string') throw new Error('No port');

  return address.port;
};

it('holds a pinned port until the stopping terminal finishes cleaning up', async () => {
  const exited = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  onTestFinished(() => finish.resolve());

  const engine = await startEngine(async (terminal) => {
    terminal.print('Local:');
  });

  const first = await promptedArchiveSession(engine.host);
  const second = await promptedArchiveSession(engine.host);
  const port = await freePort();
  await configure(first.path, { port });
  await configure(second.path, { port });
  await startReady(engine, first.sessionId);

  const terminal = engine.terminals.started[0];

  if (!terminal) throw new Error('No terminal');

  const stop = terminal.stop.bind(terminal);
  terminal.stop = async (): Promise<void> => {
    await stop();
    exited.resolve();
    await finish.promise;
  };

  const stopped = engine.call('run.stop', first.sessionId);

  try {
    await exited.promise;
    await expect(engine.call('run.start', second.sessionId)).rejects.toThrow(
      `Port ${port} of Run Configuration "web" is already in use`,
    );
  } finally {
    finish.resolve();
    await stopped;
  }

  await expect(
    engine.call('run.start', second.sessionId),
  ).resolves.toMatchObject({
    ready: true,
    port,
  });
}, 30_000);

it('removes a Checkout while another Checkout has a Run still launching', async () => {
  const attaching = Promise.withResolvers<void>();
  onTestFinished(() => attaching.resolve());

  const engine = await startEngine(async (terminal) => {
    if (terminal.launch.env.HOLD_SPAWN) await attaching.promise;

    terminal.print('Local:');
  });

  const removing = await promptedArchiveSession(engine.host);

  const { sessionId: launching } =
    await engine.host.caller.session.new(emptySessionInput);

  const project = (await engine.host.caller.project.list())[0];

  if (!project) throw new Error('No Project');

  await configure(removing.path);
  await configure(project.path, { env: { HOLD_SPAWN: '1' } });
  const terminal = await startReady(engine, removing.sessionId);
  const started = engine.call('run.start', launching);
  const otherTerminal = await engine.terminals.next();

  try {
    await archiveWithRemoval(engine, removing.sessionId);
    await expect
      .poll(() => existsSync(removing.path), { timeout: 7000 })
      .toBe(false);
    expect(terminal.stopped).toBe(true);
    expect(otherTerminal.stopped).toBe(false);
  } finally {
    attaching.resolve();
    await started;
  }
}, 30_000);

it('stops a Run whose terminal is attaching when the Server stops', async () => {
  const attaching = Promise.withResolvers<void>();
  onTestFinished(() => attaching.resolve());

  const engine = await startEngine(async () => attaching.promise);
  const { sessionId } = await engine.host.caller.session.new(emptySessionInput);
  const project = (await engine.host.caller.project.list())[0];

  if (!project) throw new Error('No Project');

  await configure(project.path);
  const starting = engine.call('run.start', sessionId).catch(() => null);
  const terminal = await engine.terminals.next();
  const stopping = engine.host.stop();

  try {
    // HTTP stops accepting new requests before the Server waits for its Runs.
    await expect
      .poll(() =>
        fetch(engine.host.url).then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
  } finally {
    attaching.resolve();
    await stopping;
    await starting;
  }

  expect(terminal.stopped).toBe(true);
}, 30_000);
