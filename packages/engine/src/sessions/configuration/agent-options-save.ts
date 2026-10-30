import type {
  SessionAgentOptionsInput,
  SessionAgentOptionsOutput,
  SlashCommand,
} from '@repo/contracts';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import type { Discovery } from './agent-options-discovery';
import { AgentOptionsJob } from './agent-options-job';
import type { Stored } from './agent-options-shared';
import type { DiscoveredSlashCommands } from './discovered-slash-commands';

// What a discovery that read its Agent's options saves: the options, and the Slash commands its session hears.
export type DiscoverySave = {
  writer: WriterActorRef;
  saved: Stored | undefined;
  slashCommands: DiscoveredSlashCommands;
  discovery: Discovery;
  input: SessionAgentOptionsInput;
  options: SessionAgentOptionsOutput;
};

type SlashCommandList = SlashCommand[] | undefined;

const ownerOf = ({
  agent,
  projectId,
}: SessionAgentOptionsInput): SessionAgentOptionsInput => ({
  agent,
  projectId,
});

const savedRevision = (saved: Stored | undefined): number =>
  saved?.revision ?? 0;

const optionsJob = (
  save: DiscoverySave,
  commands: SlashCommandList,
): AgentOptionsJob =>
  new AgentOptionsJob(ownerOf(save.input), save.options, {
    authoritative: true,
    expectedRevision: savedRevision(save.saved),
    commands,
  });

// A list that arrived after the options were saved; one already saved with them is not saved again.
const lateSlashCommands = (
  save: DiscoverySave,
  early: SlashCommandList,
): SlashCommandList => {
  const latest = save.slashCommands.list;

  return latest === early ? undefined : latest;
};

const slashCommandsJob = (
  save: DiscoverySave,
  commands: SlashCommand[],
  revision: number,
): AgentOptionsJob =>
  new AgentOptionsJob(ownerOf(save.input), undefined, {
    authoritative: false,
    expectedRevision: revision,
    commands,
  });

// Only the revision the options write committed may take the late list, so a newer write keeps its own.
async function saveLateSlashCommands(
  save: DiscoverySave,
  early: SlashCommandList,
  revision: number | undefined,
): Promise<void> {
  const late = lateSlashCommands(save, early);

  if (!late || !revision) return;

  await writeDatabaseJobAndWaitForCommit(
    save.writer,
    slashCommandsJob(save, late, revision),
  );
}

export async function saveDiscovery(
  save: DiscoverySave,
  waitMs?: number,
): Promise<void> {
  const early = save.slashCommands.list;
  const job = optionsJob(save, early);

  await writeDatabaseJobAndWaitForCommit(save.writer, job);
  save.discovery.configured(save.options);
  // Agents often send their list after opening, so a late one is saved only over the revision this discovery wrote.
  await save.slashCommands.seen(save.discovery.signal, waitMs);
  await saveLateSlashCommands(save, early, job.committedRevision());
}
