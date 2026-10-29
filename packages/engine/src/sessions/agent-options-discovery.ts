import {
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { type AcpSessionLease, requireInstalledAgent } from '../agents';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { readAcpConfiguration } from './acp/acp-configuration';
import { openOptionsSession } from './agent-options-discovery-session';
import {
  AgentOptionsJob,
  readAgentConfiguration,
} from './agent-options-storage';
import { configureOptionsSession } from './configure-options-session';
import { DiscoveredCommands } from './discovered-commands';
import type { SessionRouterDeps } from './router-deps';

const rejections = createRejectionCounter('Agent options');

export type OptionsDeps = Pick<
  SessionRouterDeps,
  | 'database'
  | 'installedAgents'
  | 'sessions'
  | 'sessionCommandSignal'
  | 'commandsWaitMs'
  | 'findWriter'
>;

export type Discovery = {
  signal: AbortSignal;
  progress: (stage: 'installing' | 'loading', fraction?: number) => void;
  // The options are saved with any Slash commands sent so far; more may still come.
  configured: (options: SessionAgentOptionsOutput) => void;
};

function availableWriter(
  deps: OptionsDeps,
): NonNullable<ReturnType<OptionsDeps['findWriter']>> {
  const writer = deps.findWriter();

  if (!writer)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Server storage is unavailable.',
    });

  return writer;
}

type Stored = ReturnType<typeof readAgentConfiguration>;

type Discovered = {
  lease: AcpSessionLease;
  saved: Stored;
  commands: DiscoveredCommands;
};

async function readOptions(
  { lease, saved }: Discovered,
  input: SessionAgentOptionsInput,
  signal: AbortSignal,
): Promise<SessionAgentOptionsOutput> {
  return configureOptionsSession(
    lease,
    readAcpConfiguration(lease.response.configOptions, rejections),
    {
      saved: saved?.configOptions ?? [],
      picks: input.picks ?? {},
      signal,
    },
  );
}

type Save = {
  deps: OptionsDeps;
  writer: NonNullable<ReturnType<OptionsDeps['findWriter']>>;
  input: SessionAgentOptionsInput;
  options: SessionAgentOptionsOutput;
};

async function saveDiscovery(
  { deps, writer, input, options }: Save,
  discovery: Discovery,
  { saved, commands }: Discovered,
): Promise<SessionAgentOptionsOutput> {
  const owner = { agent: input.agent, projectId: input.projectId };
  const early = commands.commands;

  const job = new AgentOptionsJob(owner, options, {
    authoritative: true,
    expectedRevision: saved?.revision ?? 0,
    commands: early,
  });

  await writeDatabaseJobAndWaitForCommit(writer, job);
  discovery.configured(options);
  /*
   * The options are saved at once. The Agent may send its Slash commands later, so the session
   * stays open for them and they follow in a second write that only the revision it started from may take.
   */
  await commands.seen(discovery.signal, deps.commandsWaitMs);
  const { committedRevision } = job;

  if (commands.commands && commands.commands !== early && committedRevision)
    await writeDatabaseJobAndWaitForCommit(
      writer,
      new AgentOptionsJob(owner, undefined, {
        authoritative: false,
        expectedRevision: committedRevision,
        commands: commands.commands,
      }),
    );

  return discoveryResult(deps, input, options);
}

// Discover in the Project folder and commit before publishing the refreshed snapshot.
export async function refreshAgentOptions(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  discovery: Discovery,
): Promise<SessionAgentOptionsOutput> {
  requireInstalledAgent(deps.installedAgents, input.agent);
  const writer = availableWriter(deps);

  const saved = readAgentConfiguration(
    { database: deps.database, writer },
    input,
  );

  const commands = new DiscoveredCommands();

  const lease = await openOptionsSession(deps, input, {
    ...discovery,
    discovered: commands,
  });

  try {
    const options = await readOptions(
      { lease, saved, commands },
      input,
      discovery.signal,
    );

    if (input.sessionId && saved) return options;

    return await saveDiscovery({ deps, writer, input, options }, discovery, {
      lease,
      saved,
      commands,
    });
  } finally {
    await lease.close();
  }
}

// Explicit picks need their discovered schema even when a newer Session owns persistence.
function discoveryResult(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  options: SessionAgentOptionsOutput,
): SessionAgentOptionsOutput {
  if (Object.keys(input.picks ?? {}).length) return options;

  return (
    readAgentConfiguration(
      { database: deps.database, writer: deps.findWriter() },
      input,
    )?.configOptions ?? options
  );
}
