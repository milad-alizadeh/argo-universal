import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { z } from 'zod';
import { seedProject } from '../src/projects';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';
import { operationCaller } from './operations';

const identityStep = (outputs: TerminalOutputResponse[]): ScriptedStep => ({
  type: 'terminal',
  toolCallId: 'environment',
  request: {
    command: process.execPath,
    args: [
      '-e',
      'console.log(JSON.stringify({token:process.env.ARGO_TOKEN,home:process.env.ARGO_HOME}))',
    ],
  },
  completion: 'wait-for-exit',
  outputs,
});

export async function sessionAccessHost(): Promise<AccessHost> {
  const outputs: TerminalOutputResponse[] = [];
  const host = await startAcpEngine({ steps: [identityStep(outputs)] });

  return { host, outputs };
}

type AccessHost = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  outputs: TerminalOutputResponse[];
};

const AgentIdentity = z.strictObject({ token: z.string(), home: z.string() });

type AgentIdentity = z.infer<typeof AgentIdentity>;

type AccessSession = AgentIdentity & {
  sessionId: string;
  caller: Awaited<ReturnType<typeof operationCaller>>;
};

export async function openAccessSession(
  { host, outputs }: AccessHost,
  text: string,
  projectId = emptySessionInput.projectId,
): Promise<AccessSession> {
  const created = await host.caller.session.new({
    ...emptySessionInput,
    projectId,
    prompt: [{ type: 'text', text }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  const identity = readAgentIdentity(outputs);
  const caller = await operationCaller(host, identity.token);

  return { ...created, ...identity, caller };
}

export function readAgentIdentity(
  outputs: TerminalOutputResponse[],
): AgentIdentity {
  return AgentIdentity.parse(JSON.parse(outputs.at(-1)?.output ?? ''));
}

export async function addOtherProject(
  host: AccessHost['host'],
): Promise<string> {
  const path = join(host.home, 'other-project');
  await mkdir(path);
  await initTestRepository(path);
  await seedProject(host.database, path);

  const project = (await host.caller.project.list()).find(
    (item) => item.path === path,
  );

  if (!project) throw new Error('Other Project is missing');

  return project.id;
}

export function withoutSessionAccess(): undefined {
  // The Session uses the shared Agent and Project process.
}

export async function discoverOptions(
  host: AccessHost['host'],
  subject: { agent: string; projectId: string },
): Promise<void> {
  for await (const update of await host.caller.session.agentOptions(subject))
    if (update.stage === 'ready') return;
  throw new Error('Agent configuration discovery did not finish');
}
