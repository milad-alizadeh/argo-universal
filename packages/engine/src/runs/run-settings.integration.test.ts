import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { createFakeTerminals, type FakeTerminal } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

const name = 'web';

const configuration = {
  name,
  command: 'pnpm dev',
  env: { FROM_FILE: 'source', SHARED: 'file' },
  ready: { pattern: 'Ready' },
};

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type TerminalFixture = ReturnType<typeof createFakeTerminals>;

type Fixture = {
  host: Host;
  terminals: TerminalFixture;
  target: { sessionId: string; name: string };
  file: string;
};

async function setUp(): Promise<Fixture> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  onTestFinished(terminals.end);

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const { checkout } = await host.caller.session.get({ sessionId });
  const folder = join(checkout.path, '.argo');
  const file = join(folder, 'run.json');
  await mkdir(folder, { recursive: true });
  await writeFile(file, JSON.stringify({ configurations: [configuration] }));

  return { host, terminals, target: { sessionId, name }, file };
}

async function ready(
  terminals: TerminalFixture,
  start: Promise<unknown>,
): Promise<FakeTerminal> {
  const terminal = await terminals.next();

  terminal.print('Ready');
  await start;

  return terminal;
}

const unusedPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer().once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string')
        throw new Error('The test could not find a TCP port.');

      server.close(() => resolve(address.port));
    });
  });

it('layers a Project’s personal environment and pinned port over the checked-in Run Configuration', async () => {
  const {
    host: { caller },
    terminals,
    target,
    file,
  } = await setUp();

  const port = await unusedPort();

  await expect(
    caller.run.updateSettings({
      ...target,
      env: { SHARED: 'personal', PORT: 'ignore' },
      port,
    }),
  ).resolves.toMatchObject({ env: { SHARED: 'personal' }, port });

  const terminal = await ready(terminals, caller.run.start(target));
  expect(terminal.launch.env).toMatchObject({
    FROM_FILE: 'source',
    SHARED: 'personal',
    PORT: String(port),
  });
  expect(terminal.launch.port).toBe(port);
  expect(await readFile(file, 'utf8')).toBe(
    JSON.stringify({ configurations: [configuration] }),
  );
});

async function asAgent(
  { host, target }: Fixture,
  request: { id: OperationId; params: Record<string, Json> },
): ReturnType<typeof runOperation> {
  const access = host.engine
    .getSnapshot()
    .context.sessionTokens.issue(target.sessionId, emptySessionInput.projectId);

  try {
    const agent = await operationCaller(host, access.token);

    return await runOperation(agent.operations, request);
  } finally {
    access.release();
  }
}

it('requires a person to have started the current Run Configuration before enabling auto-start', async () => {
  const fixture = await setUp();

  const {
    host: { caller },
    terminals,
    target,
  } = fixture;

  const enable = { ...target, autoStart: true };

  await expect(caller.run.updateSettings(enable)).rejects.toThrow(
    /Start this Run Configuration yourself/,
  );

  await ready(
    terminals,
    asAgent(fixture, { id: 'run.start', params: { name } }),
  );

  await expect(caller.run.getSettings(target)).resolves.toMatchObject({
    canAutoStart: false,
  });
  await expect(
    asAgent(fixture, { id: 'run.updateSettings', params: enable }),
  ).rejects.toThrow(/Only an App/);

  await ready(terminals, caller.run.restart(target));

  await expect(caller.run.updateSettings(enable)).resolves.toMatchObject({
    autoStart: true,
    canAutoStart: true,
  });
});

it('auto-starts an opted-in Run after a new Session opens in the Project', async () => {
  const {
    host: { caller },
    terminals,
    target,
  } = await setUp();

  await ready(terminals, caller.run.start(target));
  await caller.run.stop(target);
  await caller.run.updateSettings({ ...target, autoStart: true });

  const { sessionId } = await caller.session.new(emptySessionInput);
  const terminal = await terminals.next();
  terminal.print('Ready');

  await expect
    .poll(() => caller.run.status({ sessionId }))
    .toMatchObject({
      configurations: [{ name, status: 'ready', port: terminal.launch.port }],
    });
});

it('starts an opted-in Run on explicit reopen, after passive reads leave it stopped', async () => {
  const { host, terminals, target } = await setUp();
  const { caller } = host;

  await caller.session.prompt({
    sessionId: target.sessionId,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });
  await waitForAcpSessionIdle(host, target.sessionId);
  await ready(terminals, caller.run.start(target));
  await caller.run.stop(target);
  await caller.run.updateSettings({ ...target, autoStart: true });
  await closeTestSession(host, target);

  await expect(caller.run.status(target)).resolves.toMatchObject({
    configurations: [{ name, status: 'stopped' }],
  });

  await caller.session.open({ sessionId: target.sessionId });

  const terminal = await terminals.next();
  terminal.print('Ready');

  await expect
    .poll(() => caller.run.status(target))
    .toMatchObject({
      configurations: [{ name, status: 'ready' }],
    });
});

const controlConfiguration = {
  ...configuration,
  name: 'worker',
  command: 'pnpm worker',
};

it.each([
  { command: 'pnpm dev:other' },
  { cwd: 'app' },
  { env: { ...configuration.env, EXTRA: 'different' } },
])(
  'does not carry auto-start consent onto a Run Configuration with changed checked-in inputs',
  async (changed) => {
    const {
      host: { caller },
      terminals,
      target,
      file,
    } = await setUp();

    await writeFile(
      file,
      JSON.stringify({ configurations: [configuration, controlConfiguration] }),
    );

    for (const { name } of [configuration, controlConfiguration]) {
      const run = { ...target, name };

      await ready(terminals, caller.run.start(run));
      await caller.run.stop(run);
      await caller.run.updateSettings({ ...run, autoStart: true });
    }

    await writeFile(
      file,
      JSON.stringify({
        configurations: [
          { ...configuration, ...changed },
          controlConfiguration,
        ],
      }),
    );

    const { sessionId } = await caller.session.new(emptySessionInput);

    // Launches are serialized in file order, so the control queues behind any launch of the changed Run.
    const terminal = await terminals.next();
    expect(terminal.launch.command).toBe(controlConfiguration.command);
    terminal.print('Ready');

    await expect
      .poll(() => caller.run.status({ sessionId }))
      .toMatchObject({
        configurations: [
          { name, status: 'stopped' },
          { name: controlConfiguration.name, status: 'ready' },
        ],
      });
    await expect(
      caller.run.getSettings({ sessionId, name }),
    ).resolves.toMatchObject({ autoStart: false, canAutoStart: false });
    expect(terminals.started).toHaveLength(3);
  },
);

it('lists and saves the Project’s Run Configuration settings without a Session target', async () => {
  const fixture = await setUp();

  const {
    host: { caller },
    terminals,
    target,
  } = fixture;

  const { projectId } = emptySessionInput;

  await expect(caller.run.listSettings({ projectId })).resolves.toEqual([
    { name, env: {}, port: null, canAutoStart: false, autoStart: false },
  ]);
  await expect(
    asAgent(fixture, { id: 'run.listSettings', params: { projectId } }),
  ).rejects.toThrow(/Only an App/);

  await ready(terminals, caller.run.start(target));
  const env = { SHARED: 'personal' };
  const port = await unusedPort();
  await caller.run.updateSettings({
    projectId,
    name,
    env,
    port,
    autoStart: true,
  });

  await expect(caller.run.listSettings({ projectId })).resolves.toEqual([
    { name, env, port, canAutoStart: true, autoStart: true },
  ]);
  await expect(caller.run.getSettings(target)).resolves.toEqual({
    env,
    port,
    canAutoStart: true,
    autoStart: true,
  });
});
