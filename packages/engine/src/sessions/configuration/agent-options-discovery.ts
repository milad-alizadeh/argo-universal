import {
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { requireInstalledAgent, type AcpSessionLease } from '../../agents';
import type { WriterActorRef } from '../../storage';
import type { SessionSources } from '../session-sources';
import { openOptionsSession } from './agent-options-discovery-session';
import { readAgentConfiguration } from './agent-options-read';
import { saveDiscovery } from './agent-options-save';
import { type DiscoverySources, storageSources } from './agent-options-shared';
import { DiscoveredSlashCommands } from './discovered-slash-commands';
import { discoverOptions } from './discovery';

export type Discovery = {
  signal: AbortSignal;
  progress: (stage: 'installing' | 'loading', fraction?: number) => void;
  // The options are saved with any Slash commands sent so far; more may still come.
  configured: (options: SessionAgentOptionsOutput) => void;
};

type SavedOptions = ReturnType<typeof readAgentConfiguration>;

type DiscoveryState = {
  writer: WriterActorRef;
  saved: SavedOptions;
  lease: AcpSessionLease;
  slashCommands: DiscoveredSlashCommands;
  discovery: Discovery;
};

const savedConfig = (saved: SavedOptions): SessionAgentOptionsOutput =>
  saved?.configOptions ?? [];

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
    signal: state.discovery.signal,
  });
}

async function finishDiscovery(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  state: DiscoveryState,
): Promise<SessionAgentOptionsOutput> {
  const options = await discoveredOptions(input, state);

  if (input.sessionId && state.saved) return options;

  await saveDiscovery(
    { ...state, input, options },
    sources.slashCommandsWaitMs,
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
  const slashCommands = new DiscoveredSlashCommands();

  const lease = await openOptionsSession(sources, input, {
    ...discovery,
    discovered: slashCommands,
  });

  return { writer, saved, lease, slashCommands, discovery };
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
  readAgentConfiguration(storageSources(sources), input)?.configOptions;

// Explicit picks need their discovered schema even when a newer Session owns persistence.
function discoveryResult(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  options: SessionAgentOptionsOutput,
): SessionAgentOptionsOutput {
  if (hasPicks(input)) return options;

  return storedOptions(sources, input) ?? options;
}
