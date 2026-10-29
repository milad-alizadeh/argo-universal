import {
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { requireInstalledAgent } from '../agents';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { readAcpConfiguration } from './acp/acp-configuration';
import { openOptionsSession } from './agent-options-discovery-session';
import {
  AgentOptionsJob,
  readAgentConfiguration,
} from './agent-options-storage';
import { configureOptionsSession } from './configure-options-session';
import type { SessionRouterDeps } from './router-deps';

const rejections = createRejectionCounter('Agent options');

export type OptionsDeps = Pick<
  SessionRouterDeps,
  | 'database'
  | 'installedAgents'
  | 'sessions'
  | 'sessionCommandSignal'
  | 'findWriter'
>;

export type Discovery = {
  signal: AbortSignal;
  progress: (stage: 'installing' | 'loading', fraction?: number) => void;
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

  const lease = await openOptionsSession(deps, input, discovery);

  try {
    const options = await configureOptionsSession(
      lease,
      readAcpConfiguration(lease.response.configOptions, rejections),
      {
        saved: saved?.configOptions ?? [],
        picks: input.picks ?? {},
        signal: discovery.signal,
      },
    );

    if (input.sessionId && saved) return options;
    await writeDatabaseJobAndWaitForCommit(
      writer,
      new AgentOptionsJob(
        { agent: input.agent, projectId: input.projectId },
        options,
        { authoritative: true, expectedRevision: saved?.revision ?? 0 },
      ),
    );

    return discoveryResult(deps, input, options);
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
