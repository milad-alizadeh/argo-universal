import type { SessionRecord } from '@repo/contracts';
import type { ListReadInput } from './input';
import { readListSessions } from './session-rows';

type Family = { rows: SessionRecord[]; ids: Set<string> | undefined };

type AddedParents = { ids: Set<string> | undefined; addedParents: Set<string> };

export class SessionListParents {
  private readonly parents = new Map<string, string | null>();

  public related(sessionIds: readonly string[]): string[] {
    const ids = new Set(sessionIds);
    this.addKnownParents(ids);

    return [...ids];
  }

  public readFamily(
    input: ListReadInput,
    sessionIds: readonly string[] | undefined,
  ): Family {
    if (!sessionIds) this.parents.clear();
    const ids = this.readIds(sessionIds);
    let rows = readListSessions(input, optionalIds(ids));
    const addedParents = this.remember(rows, ids);

    if (addedParents.size)
      rows = this.readAddedParents(input, rows, { ids, addedParents });

    return { rows, ids };
  }

  private readIds(ids: readonly string[] | undefined): Set<string> | undefined {
    return ids && new Set(this.related(ids));
  }

  private addKnownParents(ids: Set<string>): void {
    for (const id of ids) {
      const parent = this.parents.get(id);

      if (parent) ids.add(parent);
    }
  }

  private remember(
    rows: SessionRecord[],
    ids: Set<string> | undefined,
  ): Set<string> {
    const added = new Set<string>();

    for (const row of rows) {
      this.parents.set(row.id, row.parentSessionId);

      if (this.needsParent(row, ids)) added.add(row.parentSessionId);
    }

    return added;
  }

  private needsParent(
    row: SessionRecord,
    ids: Set<string> | undefined,
  ): row is SessionRecord & { parentSessionId: string } {
    if (!ids) return false;

    return ids.has(row.id) && missingParent(row.parentSessionId, ids);
  }

  private readAddedParents(
    input: ListReadInput,
    rows: SessionRecord[],
    { ids, addedParents }: AddedParents,
  ): SessionRecord[] {
    for (const id of addedParents) ids?.add(id);

    return [
      ...new Map(
        [...rows, ...readListSessions(input, [...addedParents])].map(
          (row): [string, SessionRecord] => [row.id, row],
        ),
      ).values(),
    ];
  }
}

function optionalIds(ids: Set<string> | undefined): string[] | undefined {
  return ids && [...ids];
}

function missingParent(parent: string | null, ids: Set<string>): boolean {
  return Boolean(parent) && !ids.has(parent ?? '');
}
