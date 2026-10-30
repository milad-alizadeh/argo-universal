import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { startAcpEngine } from './acp-engine';
import { operationCaller } from './operations';
import { settingsProbe } from './plugin-settings';
import { writePlugin } from './runtime-plugins';
import {
  addOtherProject,
  openAccessSession,
  sessionIdentityStep,
} from './session-access';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type AccessSession = Awaited<ReturnType<typeof openAccessSession>>;

type ReadScopeFixture = {
  host: Host;
  calling: AccessSession;
  target: AccessSession;
  foreign: AccessSession;
  otherId: string;
  user: Awaited<ReturnType<typeof operationCaller>>;
};

const installSettings = (home: string): Promise<void> =>
  writePlugin(home, settingsProbe);

const reply = (messageId: string, text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    messageId,
    content: { type: 'text', text },
  },
});

function readScopeSteps(outputs: TerminalOutputResponse[]): ScriptedStep[] {
  return [
    sessionIdentityStep(outputs),
    reply('first', 'First result'),
    {
      type: 'update',
      update: {
        sessionUpdate: 'agent_thought_chunk',
        content: { type: 'text', text: 'Private reasoning' },
      },
    },
    reply('second', 'Second result'),
    reply('third', 'Third result'),
  ];
}

async function writeReviewFiles(host: Host, otherId: string): Promise<void> {
  const projects = (await host.caller.project.list()).filter(
    (project) => project.id === 'project-1' || project.id === otherId,
  );

  for (const project of projects) {
    await writeFile(join(project.path, 'review.txt'), 'one\ntwo\nthree\n');
    await writeFile(join(project.path, 'second.txt'), 'second\n');
  }
}

export async function sessionReadScope(
  withPlugin = false,
): Promise<ReadScopeFixture> {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    installPlugins: withPlugin ? installSettings : undefined,
    steps: readScopeSteps(outputs),
  });

  const fixture = { host, outputs };
  const otherId = await addOtherProject(host);

  await writeReviewFiles(host, otherId);

  return readScopeSessions(fixture, otherId);
}

const readScopeSessions = async (
  fixture: { host: Host; outputs: TerminalOutputResponse[] },
  otherId: string,
): Promise<ReadScopeFixture> => ({
  host: fixture.host,
  calling: await openAccessSession(fixture, 'Caller'),
  target: await openAccessSession(fixture, 'Target'),
  foreign: await openAccessSession(fixture, 'Foreign', otherId),
  otherId,
  user: await operationCaller(fixture.host),
});
