import {
  SessionConfigOption,
  type SessionAgentOptionsInput,
  type SlashCommand,
} from '@repo/contracts';
import { agentOptions, agentServers, project } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import type { QueuedAgentOptionsChange } from './agent-options-read';
import { decode, ownerWhere, type Stored } from './agent-options-shared';
import { isOfferedConfigChoice } from './offered';

type Update = {
  authoritative: boolean;
  expectedRevision?: number;
  commands?: SlashCommand[];
};

const revisionOf = (previous: Stored | undefined): number =>
  previous?.revision ?? 0;

const staleUpdate = (update: Update, previous: Stored | undefined): boolean =>
  update.expectedRevision !== undefined &&
  revisionOf(previous) !== update.expectedRevision;

const previousOptions = (previous: Stored | undefined): SessionConfigOption[] =>
  previous?.configOptions ?? [];

const previousCommands = (
  previous: Stored | undefined,
): SlashCommand[] | null => previous?.commands ?? null;

const commandsOf = (
  update: Update,
  previous: Stored | undefined,
): SlashCommand[] | null => update.commands ?? previousCommands(previous);

const savedChoice = (
  previous: Stored | undefined,
  configId: string,
): string | boolean | undefined =>
  previous?.configOptions.find((saved) => saved.configId === configId)
    ?.currentValue;

const retainChoice = (
  options: SessionConfigOption[],
  previous: Stored | undefined,
  option: SessionConfigOption,
): SessionConfigOption => {
  const value = savedChoice(previous, option.configId);

  return value !== undefined &&
    isOfferedConfigChoice(options, { configId: option.configId, value })
    ? SessionConfigOption.parse({ ...option, currentValue: value })
    : option;
};

const hasAgent = (
  transaction: StorageTransaction,
  owner: SessionAgentOptionsInput,
): boolean =>
  Boolean(
    transaction
      .select({ id: agentServers.id })
      .from(agentServers)
      .where(eq(agentServers.id, owner.agent))
      .get(),
  );

const hasProject = (
  transaction: StorageTransaction,
  owner: SessionAgentOptionsInput,
): boolean =>
  Boolean(
    transaction
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, owner.projectId))
      .get(),
  );

const hasOwner = (
  transaction: StorageTransaction,
  owner: SessionAgentOptionsInput,
): boolean => hasAgent(transaction, owner) && hasProject(transaction, owner);

type StoredRow = typeof agentOptions.$inferSelect;

const readStored = (
  transaction: StorageTransaction,
  owner: SessionAgentOptionsInput,
): StoredRow | undefined =>
  transaction.select().from(agentOptions).where(ownerWhere(owner)).get();

const unchanged = (next: Stored, row: StoredRow | undefined): boolean =>
  next.revision === row?.revision;

function saveChanged(
  transaction: StorageTransaction,
  row: StoredRow | undefined,
  next: Stored | undefined,
): void {
  if (!next || unchanged(next, row)) return;
  transaction
    .insert(agentOptions)
    .values(next)
    .onConflictDoUpdate({
      target: [agentOptions.agent, agentOptions.projectId],
      set: next,
    })
    .run();
}

// Discovery preserves preferences and cannot overwrite an ACP update received while it opened.
export class AgentOptionsJob implements WriterJob, QueuedAgentOptionsChange {
  public constructor(
    private readonly owner: SessionAgentOptionsInput,
    private readonly options: SessionConfigOption[] | undefined,
    private readonly update: Update,
  ) {}

  public describe(): string {
    return `store Agent options for ${this.owner.agent} in ${this.owner.projectId}`;
  }

  public projectAgentOptions(
    owner: SessionAgentOptionsInput,
    current: Stored | undefined,
  ): Stored | undefined {
    return this.owns(owner) ? this.project(current) : current;
  }

  private owns(owner: SessionAgentOptionsInput): boolean {
    return (
      this.owner.agent === owner.agent &&
      this.owner.projectId === owner.projectId
    );
  }

  private project(previous: Stored | undefined): Stored | undefined {
    if (staleUpdate(this.update, previous)) return previous;

    return {
      ...this.owner,
      commands: commandsOf(this.update, previous),
      configOptions: this.configuration(previous),
      revision: revisionOf(previous) + 1,
    };
  }

  private configuration(previous: Stored | undefined): SessionConfigOption[] {
    const options = this.options;

    if (options === undefined) return previousOptions(previous);

    return this.update.authoritative
      ? options
      : options.map((option) => retainChoice(options, previous, option));
  }

  public commit(transaction: StorageTransaction): void {
    // A late ACP reply cannot recreate configuration after its owner was removed.
    if (!hasOwner(transaction, this.owner)) return;

    const row = readStored(transaction, this.owner);

    const next = this.project(row && decode(row));

    saveChanged(transaction, row, next);
  }
}
