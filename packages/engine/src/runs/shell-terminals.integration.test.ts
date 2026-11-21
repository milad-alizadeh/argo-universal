import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { createFakeTerminals } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

async function projectWithTerminalSpawner() {
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
  } finally {
    await caller.terminal.close(target);
  }
}, 30_000);
