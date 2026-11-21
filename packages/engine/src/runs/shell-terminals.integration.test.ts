import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
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
