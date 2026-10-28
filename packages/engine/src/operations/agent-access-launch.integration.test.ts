import { delimiter, join } from 'node:path';
import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { createAgentMetadata } from '@repo/mocks/agent';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { fixtureRegistry } from '#mocks/agent-fixtures';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const Environment = z.strictObject({
  token: z.string().nullable(),
  home: z.string().nullable(),
  path: z.string(),
});

const environmentStep = (outputs: TerminalOutputResponse[]): ScriptedStep => ({
  type: 'terminal',
  toolCallId: 'environment',
  completion: 'wait-for-exit',
  outputs,
  request: {
    command: process.execPath,
    args: [
      '-e',
      'console.log(JSON.stringify({token:process.env.ARGO_TOKEN??null,home:process.env.ARGO_HOME??null,path:process.env.PATH}))',
    ],
  },
});

async function openAgent(
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  outputs: TerminalOutputResponse[],
): Promise<z.infer<typeof Environment>> {
  const previous = outputs.length;

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Read your launch environment' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  expect(outputs).toHaveLength(previous + 1);
  const output = outputs.at(-1);

  if (!output) throw new Error('The Agent did not report its environment');
  expect(output.exitStatus).toMatchObject({ exitCode: 0 });

  return Environment.parse(JSON.parse(output.output));
}

it('applies the public Agent access setting to new launches, preserves existing grants, and keeps it after restart', async () => {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    steps: [environmentStep(outputs)],
    fetchAgents: async () =>
      JSON.stringify(
        fixtureRegistry([createAgentMetadata()], {
          ARGO_TOKEN: 'stale-registry-token',
          ARGO_HOME: '/stale-registry-home',
        }),
      ),
  });

  const caller = await operationCaller(host);
  const enabled = await openAgent(host, outputs);
  expect(enabled.token).toEqual(expect.any(String));
  expect(enabled.home).toBe(host.home);
  const managedDirectory = join(host.home, 'cli', 'bin');
  expect(enabled.path.split(delimiter)).toContain(managedDirectory);
  const existing = await operationCaller(host, z.string().parse(enabled.token));
  await caller.operations.run.mutate({
    id: 'agent.setAccess',
    params: { enabled: false },
  });
  const disabled = await openAgent(host, outputs);
  expect(disabled.token).toBeNull();
  expect(disabled.home).toBeNull();
  expect(disabled.path.split(delimiter)).not.toContain(managedDirectory);
  expect(await existing.operations.list.query()).toContainEqual(
    expect.objectContaining({ id: 'project.list' }),
  );
  await host.stop();

  const agent = createScriptedAgentProcess({
    steps: [environmentStep(outputs)],
  });

  const restarted = await startEngineTestHost({ home: host.home, acp: agent });
  const afterRestart = await operationCaller(restarted);
  expect(
    await afterRestart.operations.run.mutate({
      id: 'agent.getAccess',
      params: {},
    }),
  ).toEqual({ enabled: false });
  const stillDisabled = await openAgent(restarted, outputs);
  expect(stillDisabled.token).toBeNull();
  expect(stillDisabled.home).toBeNull();
  expect(stillDisabled.path.split(delimiter)).not.toContain(managedDirectory);
  await afterRestart.operations.run.mutate({
    id: 'agent.setAccess',
    params: { enabled: true },
  });
  const reenabled = await openAgent(restarted, outputs);
  expect(reenabled.token).toEqual(expect.any(String));
  expect(reenabled.path.split(delimiter)).toContain(managedDirectory);
}, 30_000);
