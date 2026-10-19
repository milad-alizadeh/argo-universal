import {
  AgentConfiguration,
  type SessionAgentOptionsInput,
  type SessionConfigOption,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentOptions, agentServers, project } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  readQueuedJobs,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import { isOfferedConfigChoice } from './admission/config-admission';

type Stored = AgentConfiguration & { revision: number };
type Sources = { database: Database; writer?: WriterActorRef };

const ownerWhere = (owner: SessionAgentOptionsInput) =>
  and(
    eq(agentOptions.agent, owner.agent),
    eq(agentOptions.projectId, owner.projectId),
  );

const decode = (row: typeof agentOptions.$inferSelect): Stored => ({
  ...AgentConfiguration.parse({
    agent: row.agent,
    projectId: row.projectId,
    configOptions: row.configOptions,
  }),
  revision: row.revision,
});

export function readAgentConfiguration(
  sources: Sources,
  owner: SessionAgentOptionsInput,
): Stored | undefined {
  const row = sources.database
    .select()
    .from(agentOptions)
    .where(ownerWhere(owner))
    .get();
  let current = row && decode(row);
  for (const job of readQueuedJobs(sources.writer))
    if (job instanceof AgentOptionsJob && job.owns(owner))
      current = job.project(current);
  return current;
}

// Discovery preserves preferences and cannot overwrite an ACP update received while it opened.
export class AgentOptionsJob implements WriterJob {
  public constructor(
    public readonly owner: SessionAgentOptionsInput,
    private readonly options: SessionConfigOption[],
    private readonly authoritative: boolean,
    private readonly expectedRevision?: number,
  ) {}

  public describe(): string {
    return `store Agent options for ${this.owner.agent} in ${this.owner.projectId}`;
  }

  public owns(owner: SessionAgentOptionsInput): boolean {
    return (
      this.owner.agent === owner.agent &&
      this.owner.projectId === owner.projectId
    );
  }

  public project(previous: Stored | undefined): Stored | undefined {
    if (
      this.expectedRevision !== undefined &&
      (previous?.revision ?? 0) !== this.expectedRevision
    )
      return previous;
    return {
      ...this.owner,
      configOptions: this.authoritative
        ? this.options
        : this.options.map((option) => {
            const value = previous?.configOptions.find(
              (saved) => saved.configId === option.configId,
            )?.currentValue;
            return value !== undefined &&
              isOfferedConfigChoice(this.options, {
                configId: option.configId,
                value,
              })
              ? ({ ...option, currentValue: value } as SessionConfigOption)
              : option;
          }),
      revision: (previous?.revision ?? 0) + 1,
    };
  }

  public commit(transaction: StorageTransaction): void {
    // A late ACP reply cannot recreate configuration after its owner was removed.
    if (
      !transaction
        .select({ id: agentServers.id })
        .from(agentServers)
        .where(eq(agentServers.id, this.owner.agent))
        .get() ||
      !transaction
        .select({ id: project.id })
        .from(project)
        .where(eq(project.id, this.owner.projectId))
        .get()
    )
      return;
    const row = transaction
      .select()
      .from(agentOptions)
      .where(ownerWhere(this.owner))
      .get();
    const next = this.project(row && decode(row));
    if (!next || next.revision === row?.revision) return;
    transaction
      .insert(agentOptions)
      .values(next)
      .onConflictDoUpdate({
        target: [agentOptions.agent, agentOptions.projectId],
        set: next,
      })
      .run();
  }
}
