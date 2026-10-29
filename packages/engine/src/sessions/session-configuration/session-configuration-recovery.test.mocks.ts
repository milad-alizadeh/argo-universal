import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { startAcpEngine } from '#mocks/acp-engine';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

export const configuration: SessionConfigOption[] = acpConfiguration.map(
  (option) =>
    option.id === 'mode' && option.type === 'select'
      ? {
          ...option,
          options: [
            { value: 'code', name: 'Code' },
            { value: 'read-only', name: 'Read-only' },
          ],
        }
      : option,
);

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type Identity = (typeof fixtureAgents)[number];

type Recovery = { identity: Identity; kind: string; sessionId: string };

async function restart(host: Host, identity: Identity): Promise<Host> {
  await host.stop();

  return {
    ...host,
    ...(await startEngineTestHost({
      home: host.home,
      acp: host.agent,
      fixtureAgents: [identity],
    })),
  };
}

async function exit(host: Host, sessionId: string): Promise<void> {
  const events = await host.caller.feed.subscribe({ sessionId, after: null });
  const process = requireScriptedProcessAt(host.agent.processes);

  process.exited.resolve();
  process.connection.close();

  for await (const event of events) if (event.type === 'closed') break;
}

export async function recoverSession(
  host: Host,
  recovery: Recovery,
): Promise<Host> {
  if (recovery.kind === 'restart') return restart(host, recovery.identity);

  await (recovery.kind === 'exit'
    ? exit(host, recovery.sessionId)
    : host.caller.session.close({ sessionId: recovery.sessionId }));

  return host;
}
