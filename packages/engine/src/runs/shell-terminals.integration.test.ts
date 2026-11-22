import { randomUUID } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { createFakeTerminals } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';
import { processIsRunning } from '#mocks/shell-process';
import {
  shellTerminalOutputFolder,
  shellTerminalOutputPath,
} from '../lib/terminal-owner';
import { launchTerminal } from './node-pty-terminal';
import { createRunOutput } from './run-output';
import { recordCheckoutTerminalOwner } from './shell-terminal-owners';

type TestShells = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  terminals: ReturnType<typeof createFakeTerminals>;
  sessionId: string;
};

async function projectWithTerminalSpawner(): Promise<TestShells> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  onTestFinished(terminals.end);
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  return { host, terminals, sessionId };
}

it('opens a plain shell in the Session Checkout and lists it until Close stops the shell', async () => {
  const { host, terminals, sessionId } = await projectWithTerminalSpawner();
  const { caller } = host;
  const { checkout } = await caller.session.get({ sessionId });

  const shell = await caller.terminal.open({ sessionId });
  const terminal = await terminals.next();

  expect(shell).toMatchObject({ name: 'Terminal', cwd: checkout.path });
  expect(terminal.launch).toMatchObject({
    cwd: checkout.path,
    env: { PORT: expect.any(String), ARGO_PORT_0: expect.any(String) },
  });
  await expect(caller.run.status({ sessionId })).resolves.toEqual({
    configurations: [],
    shells: [shell],
  });

  await caller.terminal.close({ sessionId, shellId: shell.id });

  expect(terminal.stopped).toBe(true);
  await expect(caller.run.status({ sessionId })).resolves.toEqual({
    configurations: [],
  });
});

it('lets the person type and the Agent read a shell while refusing Agent input', async () => {
  const { host, terminals, sessionId } = await projectWithTerminalSpawner();
  const { caller } = host;
  const shell = await caller.terminal.open({ sessionId });
  const terminal = await terminals.next();
  const target = { shellId: shell.id };

  await caller.terminal.send({ ...target, sessionId, input: 'pwd\r' });
  expect(terminal.written).toEqual(['pwd\r']);
  terminal.print('opened checkout\r\n');

  const { projectId } = await caller.session.get({ sessionId });

  const access = host.engine
    .getSnapshot()
    .context.sessionTokens.issue(sessionId, projectId);

  onTestFinished(() => access.release());
  const agent = await operationCaller(host, access.token);

  await expect(
    runOperation(agent.operations, { id: 'terminal.read', params: target }),
  ).resolves.toMatchObject({
    screen: 'opened checkout',
  });
  await expect(
    runOperation(agent.operations, {
      id: 'terminal.send',
      params: { ...target, input: 'exit\r' },
    }),
  ).rejects.toMatchObject({
    data: { code: 'FORBIDDEN' },
  });
  expect(terminal.written).toEqual(['pwd\r']);
});

it('archiving one Session closes only its shells on a shared Checkout', async () => {
  const { host, terminals, sessionId } = await projectWithTerminalSpawner();
  const { caller } = host;
  const own = await caller.terminal.open({ sessionId });
  const first = await terminals.next();
  const other = await caller.session.new(emptySessionInput);
  const surviving = await caller.terminal.open(other);
  const second = await terminals.next();

  await caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });
  await waitForAcpSessionIdle(host, sessionId);
  await caller.session.archive({ sessionId });

  expect(first.stopped).toBe(true);
  expect(second.stopped).toBe(false);
  await expect(caller.run.status(other)).resolves.toMatchObject({
    shells: [surviving],
  });
  await expect(
    caller.terminal.read({ ...other, shellId: own.id }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(caller.terminal.open({ sessionId })).rejects.toMatchObject({
    code: 'CONFLICT',
  });
});

const backgroundJob = 'nohup sleep 60 9<&- >/dev/null 2>&1 & echo ArgoJob:$!\r';

async function jobPid(read: () => string | Promise<string>): Promise<number> {
  let pid = 0;

  await expect
    .poll(async () => {
      pid = Number((await read()).match(/ArgoJob:(\d+)/)?.[1] ?? 0);

      return pid > 0 && processIsRunning(pid);
    })
    .toBe(true);
  onTestFinished(() => {
    if (processIsRunning(pid)) process.kill(pid, 'SIGKILL');
  });

  return pid;
}

it('closing a shell ends its background jobs and leaves another shell alone', async () => {
  const { caller } = await startAcpEngine({ steps: [] });
  const { sessionId } = await caller.session.new(emptySessionInput);
  const { id: closed } = await caller.terminal.open({ sessionId });
  const { id: kept } = await caller.terminal.open({ sessionId });
  const first = { sessionId, shellId: closed };
  const second = { sessionId, shellId: kept };

  await caller.terminal.send({ ...first, input: backgroundJob });
  await caller.terminal.send({ ...second, input: backgroundJob });

  const removed = await jobPid(
    async () => (await caller.terminal.read(first)).screen,
  );

  const remaining = await jobPid(
    async () => (await caller.terminal.read(second)).screen,
  );

  await caller.terminal.close(first);
  expect(processIsRunning(removed)).toBe(false);
  expect(processIsRunning(remaining)).toBe(true);

  await caller.terminal.close(second);
  expect(processIsRunning(remaining)).toBe(false);
}, 30_000);

it('runs commands in a real interactive shell in the Checkout', async () => {
  const { caller } = await startAcpEngine({ steps: [] });
  const { sessionId } = await caller.session.new(emptySessionInput);
  const { checkout } = await caller.session.get({ sessionId });
  const { id: shellId } = await caller.terminal.open({ sessionId });
  const target = { sessionId, shellId };

  try {
    await caller.terminal.send({
      ...target,
      input: 'printf \'ArgoShell:%s\\n\' "$PWD"\r',
    });
    await expect
      .poll(async () => (await caller.terminal.read(target)).screen)
      .toContain(`ArgoShell:${checkout.path}`);
    await caller.terminal.send({ ...target, input: 'exit\r' });
    await expect
      .poll(() => caller.run.status({ sessionId }))
      .toEqual({
        configurations: [],
      });
  } finally {
    await caller.terminal.close(target);
  }
}, 30_000);

async function expectRecoveryToRefuseStaleOwner(
  host: TestShells['host'],
  pid: number,
  survivor = pid,
): Promise<void> {
  const forgetStaleOwner = await recordCheckoutTerminalOwner(
    host.home,
    pid,
    randomUUID(),
  );

  try {
    await expect(
      startEngineTestHost({ home: host.home, acp: host.agent }),
    ).rejects.toThrow('Actor terminated');
    expect(processIsRunning(survivor)).toBe(true);
  } finally {
    await forgetStaleOwner();
  }
}

it('recovery marks an interrupted shell Terminal lost and clears its process and output', async () => {
  vi.stubEnv('SHELL', '/bin/bash');
  onTestFinished(() => void vi.unstubAllEnvs());
  const host = await startAcpEngine({ steps: [] });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });

  await waitForAcpSessionIdle(host, sessionId);
  const { checkout } = await host.caller.session.get({ sessionId });

  await host.stop();

  const id = randomUUID();
  const outputPath = shellTerminalOutputPath(host.home, id);

  await createRunOutput(outputPath);

  const terminal = await launchTerminal({
    id,
    cwd: checkout.path,
    command: '',
    env: {},
    port: 3000,
    shell: { outputPath },
  });

  onTestFinished(() => terminal.stop());
  const { pid } = terminal;

  if (pid === undefined) throw new Error('Missing Terminal process ID');

  await expectRecoveryToRefuseStaleOwner(host, pid);
  let screen = '';
  terminal.onData((text) => {
    screen += text;
  });
  terminal.write(backgroundJob);
  const job = await jobPid(() => screen);

  await writeFile(outputPath, 'interrupted output');
  process.kill(pid, 'SIGKILL');
  await expect.poll(() => processIsRunning(pid)).toBe(false);

  await expectRecoveryToRefuseStaleOwner(host, pid, job);
  await recordCheckoutTerminalOwner(host.home, pid, id);

  const restarted = await startEngineTestHost({
    home: host.home,
    acp: host.agent,
  });

  expect(processIsRunning(job)).toBe(false);
  expect(await readdir(join(host.home, 'shell-processes'))).toEqual([]);
  await expect(
    readdir(shellTerminalOutputFolder(host.home)),
  ).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(
    readFile(join(host.home, 'logs', 'engine.log'), 'utf8'),
  ).resolves.toContain(`Shell Terminal ${id} marked lost after Engine exit`);
  await expect(restarted.caller.run.status({ sessionId })).resolves.toEqual({
    configurations: [],
  });
}, 30_000);
