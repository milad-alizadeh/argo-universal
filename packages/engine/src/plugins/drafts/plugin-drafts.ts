import {
  DraftComment,
  DraftPick,
  type DraftChoice,
} from '@repo/contracts/operations/plugin-drafts';
import type { Database } from '@repo/db';
import { pluginDraft } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../../storage';

export type PluginDraftsDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
};

export type ChosenDraft = Pick<DraftChoice, 'picks' | 'comments'>;

const Picks = z.array(DraftPick);

const Comments = z.array(DraftComment);

// Which Session draws a Plugin's Draft, and what the author last chose for it (ADR-0057). Kept in Argo's database so the Agent reads the choice back after a restart.
export class PluginDrafts {
  public constructor(private readonly deps: PluginDraftsDeps) {}

  // The Session whose Agent draws the Draft, once `plugin.draft.show` has named one.
  public sessionOf(pluginId: string): string | null {
    return (
      this.deps.database
        .select({ sessionId: pluginDraft.sessionId })
        .from(pluginDraft)
        .where(eq(pluginDraft.pluginId, pluginId))
        .get()?.sessionId ?? null
    );
  }

  public choice(pluginId: string): DraftChoice | null {
    const row = this.deps.database
      .select()
      .from(pluginDraft)
      .where(eq(pluginDraft.pluginId, pluginId))
      .get();

    if (!row?.sessionId || row.chosenAt === null) return null;

    return {
      sessionId: row.sessionId,
      picks: Picks.parse(row.picks),
      comments: Comments.parse(row.comments),
      chosenAt: row.chosenAt,
    };
  }

  public drawnBy(pluginId: string, sessionId: string): Promise<void> {
    return this.write(
      `record the Session drawing Plugin ${pluginId}'s Draft`,
      (transaction) =>
        transaction
          .insert(pluginDraft)
          .values({ pluginId, sessionId })
          .onConflictDoUpdate({
            target: pluginDraft.pluginId,
            set: { sessionId },
          })
          .run(),
    );
  }

  public choose(pluginId: string, chosen: ChosenDraft): Promise<void> {
    const set = { ...chosen, chosenAt: Date.now() };

    return this.write(
      `record the choice for Plugin ${pluginId}'s Draft`,
      (transaction) =>
        transaction
          .update(pluginDraft)
          .set(set)
          .where(eq(pluginDraft.pluginId, pluginId))
          .run(),
    );
  }

  private write(
    description: string,
    commit: (transaction: StorageTransaction) => void,
  ): Promise<void> {
    const job: WriterJob = { describe: () => description, commit };

    return writeDatabaseJobAndWaitForCommit(
      this.deps.databaseWriter,
      job,
      true,
    );
  }
}
