import type { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';

type SessionTitleChange = {
  id: string;
  title: string;
  titleSource: Exclude<SessionRecord['titleSource'], 'prompt'>;
};

const titleIsProtected = (
  change: SessionTitleChange,
  current: SessionRecord,
): boolean => change.titleSource === 'agent' && current.titleSource === 'user';

// A user title outranks every later Agent title; the check runs in the commit, so a queued Agent title cannot replace a rename.
export class SessionTitleJob implements WriterJob {
  public constructor(private readonly change: SessionTitleChange) {}

  public describe(): string {
    return `title Session ${this.change.id} from ${this.change.titleSource}`;
  }

  public commit(transaction: StorageTransaction): void {
    const { id, title, titleSource } = this.change;

    transaction
      .update(session)
      .set({ title, titleSource })
      .where(
        titleSource === 'user'
          ? eq(session.id, id)
          : and(eq(session.id, id), ne(session.titleSource, 'user')),
      )
      .run();
  }

  public session(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    if (!current) return current;

    return this.projectTitle(current, sessionId);
  }

  private projectTitle(
    current: SessionRecord,
    sessionId: string,
  ): SessionRecord {
    if (this.change.id !== sessionId) return current;

    if (titleIsProtected(this.change, current)) return current;

    return {
      ...current,
      title: this.change.title,
      titleSource: this.change.titleSource,
    };
  }

  public changedSessionIds(): string[] {
    return [this.change.id];
  }
}
