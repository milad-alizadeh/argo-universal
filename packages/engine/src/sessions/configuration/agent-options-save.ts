import type {
  SessionAgentOptionsInput,
  SessionAgentOptionsOutput,
  SlashCommand,
} from '@repo/contracts';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import { AgentOptionsJob } from './agent-options-job';
import type { Stored } from './agent-options-shared';
import type { DiscoveredCommands } from './discovered-commands';

// What a discovery that read its Agent's options saves: the options, and the Slash commands its session hears.
export type DiscoverySave = {
  writer: WriterActorRef;
  saved: Stored | undefined;
  commands: DiscoveredCommands;
  signal: AbortSignal;
  input: SessionAgentOptionsInput;
  options: SessionAgentOptionsOutput;
};

type Commands = SlashCommand[] | undefined;

const ownerOf = ({
  agent,
  projectId,
}: SessionAgentOptionsInput): SessionAgentOptionsInput => ({
  agent,
  projectId,
});

const savedRevision = (saved: Stored | undefined): number =>
  saved?.revision ?? 0;

const optionsJob = (save: DiscoverySave, commands: Commands): AgentOptionsJob =>
  new AgentOptionsJob(ownerOf(save.input), save.options, {
    authoritative: true,
    expectedRevision: savedRevision(save.saved),
    commands,
  });

// A list that arrived after the options were saved; one already saved with them is not saved again.
const lateCommands = (save: DiscoverySave, early: Commands): Commands => {
  const latest = save.commands.commands;

  return latest === early ? undefined : latest;
};

const commandsJob = (
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
async function saveLateCommands(
  save: DiscoverySave,
  early: Commands,
  revision: number | undefined,
): Promise<void> {
  const commands = lateCommands(save, early);

  if (!commands || !revision) return;

  await writeDatabaseJobAndWaitForCommit(
    save.writer,
    commandsJob(save, commands, revision),
  );
}

export async function saveDiscovery(
  save: DiscoverySave,
  waitMs?: number,
): Promise<void> {
  const early = save.commands.commands;
  const job = optionsJob(save, early);

  await writeDatabaseJobAndWaitForCommit(save.writer, job);
  /*
   * The options are saved at once. The Agent may send its Slash commands later, so the session
   * stays open for them and they follow in a second write that only the revision it started from may take.
   */
  await save.commands.seen(save.signal, waitMs);
  await saveLateCommands(save, early, job.committedRevision);
}
