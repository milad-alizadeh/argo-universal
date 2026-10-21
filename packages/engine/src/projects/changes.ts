import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import type { WriterActorRef } from '../storage';

const watchers = new WeakMap<Database, Set<() => void>>();

export function watchProjectChanges(
  database: Database,
  changed: () => void,
  writer?: WriterActorRef,
): () => void {
  const listeners = watchers.get(database) ?? new Set();
  const membership = new ProjectMembership(database, changed);

  watchers.set(database, listeners);
  listeners.add(membership.notify);

  return membership.listen(writer, () => listeners.delete(membership.notify));
}

// SQLite records Project table writes; unrelated Writer commits need no SQL read.
class ProjectMembership {
  private changes;
  private previous;

  constructor(
    private readonly database: Database,
    private readonly changed: () => void,
  ) {
    this.previous = projectIds(database);
    this.changes = database.$client.createSession({ table: 'project' });
  }

  listen(writer: WriterActorRef | undefined, released: () => void): () => void {
    const committed = writer?.on('writer.committed', this.notify);

    return (): void => {
      released();
      committed?.unsubscribe();
      this.changes.close();
    };
  }

  readonly notify = (): void => {
    if (!this.takeChanges()) return;
    const current = projectIds(this.database);

    if (this.previous === current) return;
    this.previous = current;
    this.changed();
  };

  private takeChanges(): boolean {
    if (!this.changes.changeset().byteLength) return false;
    this.changes.close();
    this.changes = this.database.$client.createSession({ table: 'project' });

    return true;
  }
}

function projectIds(database: Database): string {
  return JSON.stringify(
    database.select({ id: project.id }).from(project).orderBy(project.id).all(),
  );
}

export function notifyProjectChanges(database: Database): void {
  for (const changed of watchers.get(database) ?? []) changed();
}
