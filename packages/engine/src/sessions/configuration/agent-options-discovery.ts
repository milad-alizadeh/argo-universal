import {
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { requireInstalledAgent, type AcpSessionLease } from '../../agents';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import type { SessionSources } from '../session-sources';
import { openOptionsSession } from './agent-options-discovery-session';
import { AgentOptionsJob } from './agent-options-job';
import { readAgentConfiguration } from './agent-options-read';
import type { DiscoverySources } from './agent-options-shared';
import { discoverOptions } from './discovery';

export type Discovery = {
  signal: AbortSignal;
  progress: (stage: 'installing' | 'loading', fraction?: number) => void;
};

type SavedOptions = ReturnType<typeof readAgentConfiguration>;

type DiscoveryState = {
  writer: WriterActorRef;
  saved: SavedOptions;
  lease: AcpSessionLease;
  signal: AbortSignal;
};

const savedConfig = (saved: SavedOptions): SessionAgentOptionsOutput =>
  saved?.configOptions ?? [];

const savedRevision = (saved: SavedOptions): number => saved?.revision ?? 0;

const inputPicks = (
  input: SessionAgentOptionsInput,
): NonNullable<SessionAgentOptionsInput['picks']> => input.picks ?? {};

async function discoveredOptions(
  input: SessionAgentOptionsInput,
  state: DiscoveryState,
): Promise<SessionAgentOptionsOutput> {
  return discoverOptions(state.lease, {
    saved: savedConfig(state.saved),
    picks: inputPicks(input),
    signal: state.signal,
  });
}

const discoveryJob = (
  input: SessionAgentOptionsInput,
  options: SessionAgentOptionsOutput,
  saved: SavedOptions,
): AgentOptionsJob =>
  new AgentOptionsJob(
    { agent: input.agent, projectId: input.projectId },
    options,
    { authoritative: true, expectedRevision: savedRevision(saved) },
  );

async function finishDiscovery(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  state: DiscoveryState,
): Promise<SessionAgentOptionsOutput> {
  const options = await discoveredOptions(input, state);

  if (input.sessionId && state.saved) return options;

  await writeDatabaseJobAndWaitForCommit(
    state.writer,
    discoveryJob(input, options, state.saved),
  );

  return discoveryResult(sources, input, options);
}

function availableWriter(
  sources: DiscoverySources,
): NonNullable<ReturnType<SessionSources['findWriter']>> {
  const writer = sources.findWriter();

  if (!writer)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Server storage is unavailable.',
    });

  return writer;
}

const readSavedOptions = (
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  writer: WriterActorRef,
): SavedOptions =>
  readAgentConfiguration({ database: sources.database, writer }, input);

async function prepareDiscovery(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  discovery: Discovery,
): Promise<DiscoveryState> {
  requireInstalledAgent(sources.installedAgents, input.agent);
  const writer = availableWriter(sources);
  const saved = readSavedOptions(sources, input, writer);
  const lease = await openOptionsSession(sources, input, discovery);

  return { writer, saved, lease, signal: discovery.signal };
}

// Discover in the Project folder and commit before publishing the refreshed snapshot.
export async function refreshAgentOptions(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  discovery: Discovery,
): Promise<SessionAgentOptionsOutput> {
  const state = await prepareDiscovery(sources, input, discovery);

  try {
    return await finishDiscovery(sources, input, state);
  } finally {
    await state.lease.close();
  }
}

const hasPicks = (input: SessionAgentOptionsInput): boolean =>
  Object.keys(inputPicks(input)).length > 0;

const storedOptions = (
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
): SessionAgentOptionsOutput | undefined =>
  readAgentConfiguration(
    { database: sources.database, writer: sources.findWriter() },
    input,
  )?.configOptions;

// Explicit picks need their discovered schema even when a newer Session owns persistence.
function discoveryResult(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  options: SessionAgentOptionsOutput,
): SessionAgentOptionsOutput {
  if (hasPicks(input)) return options;

  return storedOptions(sources, input) ?? options;
}
