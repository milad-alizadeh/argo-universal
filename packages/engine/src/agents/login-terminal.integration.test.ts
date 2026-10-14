import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { resourceInitialization } from '#mocks/acp-resource';
import {
  loginScenario,
  loginAgentId,
  loginOwner,
  otherLoginOwner,
} from '#mocks/agent-login';
import { awaitSettledReadiness } from '#mocks/engine';
import { createLoginTerminalMock } from '#mocks/login-terminal';
const terminalScenario = (): ReturnType<typeof loginScenario> => ({
  ...loginScenario(),
  initialize: {
    ...resourceInitialization,
    authMethods: [{ type: 'terminal', id: 'terminal', name: 'Terminal' }],
  },
});
const startTerminal = async (
  options: { loginTimeoutMs?: number } = {},
): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  terminal: ReturnType<typeof createLoginTerminalMock>;
  identity: { operationId: string; ownerToken: string };
}> => {
  const terminal = createLoginTerminalMock();
  const host = await startAcpEngine({
    ...terminalScenario(),
    launchLoginTerminal: terminal.launchLoginTerminal,
    ...options,
  });
  const started = await host.caller.agents.startLogin({
    agentId: loginAgentId,
    ownerToken: loginOwner,
  });
  const identity = { operationId: started.operationId, ownerToken: loginOwner };
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe('choose-method');
  await host.caller.agents.chooseLoginMethod({
    ...identity,
    methodId: 'terminal',
  });
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).terminal)
    .toBe(true);
  return { host, terminal, identity };
};
it(
  'keeps terminal input and output owned over HTTP and rejects another App',
  { timeout: 15_000 },
  async () => {
    const { host, terminal, identity } = await startTerminal();
    terminal.emit('Account?\r\n');
    const input = encodeURIComponent(
      JSON.stringify({ ...identity, cursor: 0 }),
    );
    const response = await fetch(
      `${host.url}/trpc/agents.loginTerminal?input=${input}`,
    );
    expect(await response.json()).toMatchObject({
      result: { data: { output: 'Account?\r\n' } },
    });
    const other = { ...identity, ownerToken: otherLoginOwner };
    await expect(
      host.caller.agents.loginTerminal({ ...other, cursor: 0 }),
    ).rejects.toThrow('another App');
    await expect(
      host.caller.agents.inputLoginTerminal({
        ...other,
        input: { type: 'write', text: 'secret' },
      }),
    ).rejects.toThrow('another App');
    await host.caller.agents.inputLoginTerminal({
      ...identity,
      input: { type: 'write', text: '\r' },
    });
    await host.caller.agents.inputLoginTerminal({
      ...identity,
      input: { type: 'resize', cols: 40, rows: 12 },
    });
    expect({ writes: terminal.writes, sizes: terminal.sizes }).toEqual({
      writes: ['\r'],
      sizes: [[40, 12]],
    });
    terminal.exited.resolve({ exitCode: 0 });
    await expect
      .poll(async () => (await host.caller.agents.login(identity)).status)
      .toBe('ready');
    expect(
      await host.caller.agents.loginTerminal({ ...identity, cursor: 10 }),
    ).toEqual({ cursor: 10, output: '', closed: true });
  },
);
it.each([
  { action: 'cancel', status: 'cancelled' },
  { action: 'timeout', status: 'timed-out' },
])('closes owned terminal resources on $action', async ({ action, status }) => {
  const { host, terminal, identity } = await startTerminal({
    loginTimeoutMs: action === 'timeout' ? 1000 : undefined,
  });
  if (action === 'cancel') await host.caller.agents.cancelLogin(identity);
  await terminal.closed;
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe(status);
  await expect(
    host.caller.agents.inputLoginTerminal({
      ...identity,
      input: { type: 'write', text: 'x' },
    }),
  ).rejects.toThrow('not running');
});
it('fails nonzero terminal exit without treating it as account readiness', async () => {
  const { host, terminal, identity } = await startTerminal();
  terminal.exited.resolve({ exitCode: 1 });
  await expect
    .poll(async () => (await host.caller.agents.login(identity)).status)
    .toBe('failed');
  await awaitSettledReadiness(host.caller, host.agent);
  expect((await host.caller.agents.login(identity)).status).toBe('failed');
});
