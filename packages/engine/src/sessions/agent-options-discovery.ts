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
import { DiscoveredSlashCommands } from './discovered-slash-commands';
import type { SessionRouterDeps } from './router-deps';

const rejections = createRejectionCounter('Agent options');

export type OptionsDeps = Pick<
  SessionRouterDeps,
  | 'database'
  | 'installedAgents'
  | 'sessions'
  | 'sessionCommandSignal'
  | 'slashCommandsWaitMs'
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

type SavedConfiguration = ReturnType<typeof readAgentConfiguration>;

type Writer = NonNullable<ReturnType<OptionsDeps['findWriter']>>;

async function readOptions(
  lease: AcpSessionLease,
  saved: SavedConfiguration,
  { input, signal }: { input: SessionAgentOptionsInput; signal: AbortSignal },
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

type DiscoveryOutcome = {
  input: SessionAgentOptionsInput;
  options: SessionAgentOptionsOutput;
  saved: SavedConfiguration;
  slashCommands: DiscoveredSlashCommands;
};

async function saveDiscovery(
  { deps, writer }: { deps: OptionsDeps; writer: Writer },
  discovery: Discovery,
  { input, options, saved, slashCommands }: DiscoveryOutcome,
): Promise<SessionAgentOptionsOutput> {
  const owner = { agent: input.agent, projectId: input.projectId };
  const early = slashCommands.list;

  const job = new AgentOptionsJob(owner, options, {
    authoritative: true,
    expectedRevision: saved?.revision ?? 0,
    commands: early,
  });

  await writeDatabaseJobAndWaitForCommit(writer, job);
  discovery.configured(options);
  // Agents often send their list after opening, so a late one is saved only over the revision this discovery wrote.
  await slashCommands.seen(discovery.signal, deps.slashCommandsWaitMs);
  const committedRevision = job.committedRevision();
  const late = slashCommands.list;

  if (late && late !== early && committedRevision)
    await writeDatabaseJobAndWaitForCommit(
      writer,
      new AgentOptionsJob(owner, undefined, {
        authoritative: false,
        expectedRevision: committedRevision,
        commands: late,
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

  const slashCommands = new DiscoveredSlashCommands();

  const lease = await openOptionsSession(deps, input, {
    ...discovery,
    discovered: slashCommands,
  });

  try {
    const options = await readOptions(lease, saved, {
      input,
      signal: discovery.signal,
    });

    if (input.sessionId && saved) return options;

    return await saveDiscovery({ deps, writer }, discovery, {
      input,
      options,
      saved,
      slashCommands,
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
