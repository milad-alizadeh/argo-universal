import type { AgentOptionsUpdate } from '@repo/contracts';
import { slashCommandsUpdate } from '@repo/mocks/agent/slash-commands-update';
import { emptySessionInput, type startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

export const owner = {
  agent: emptySessionInput.agent,
  projectId: emptySessionInput.projectId,
};

export const deploy = { name: 'deploy', description: 'deploy' };

export const review = { name: 'review', description: 'Review changes' };

type Updates = AsyncIterator<AgentOptionsUpdate>;

async function nextWhere(
  stream: Updates,
  matches: (update: AgentOptionsUpdate) => boolean,
  ended: string,
): Promise<AgentOptionsUpdate> {
  const next = await stream.next();

  if (next.done) throw new Error(ended);

  return matches(next.value) ? next.value : nextWhere(stream, matches, ended);
}

export const nextWithSlashCommands = (
  stream: Updates,
): Promise<AgentOptionsUpdate> =>
  nextWhere(
    stream,
    (update) => update.commands !== null,
    'Discovery ended without Slash commands',
  );

export const nextReady = (stream: Updates): Promise<AgentOptionsUpdate> =>
  nextWhere(
    stream,
    (update) => update.stage === 'ready',
    'Discovery ended before it was ready',
  );

// Ends a reader's stream, as the App does when New Session closes.
export async function finish(stream: Updates): Promise<void> {
  await stream.return?.();
}

export type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type SlashCommands = readonly { name: string; description: string }[];

type Discovering = { agent?: string; delayMs?: number; sessionId?: string };

const discovering = { agent: owner.agent, delayMs: 0, sessionId: 'owned-1' };

// An Agent sends its list once the discovery session is open, so play it after the options are ready.
export async function discoverWith(
  host: Host,
  slashCommands: SlashCommands,
  options: Discovering = {},
): Promise<Updates> {
  const { agent, delayMs, sessionId } = { ...discovering, ...options };

  const stream = (await host.caller.session.agentOptions({ ...owner, agent }))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await requireScriptedProcessAt(
    host.agent.processes,
    host.agent.processes.length - 1,
  ).play([slashCommandsUpdate(slashCommands)], sessionId);

  return stream;
}
