import type { SessionUpdate } from '@repo/contracts';

const byPosition = (first: SessionUpdate, second: SessionUpdate): number =>
  first.position - second.position;

function isAlreadyHeld(
  known: SessionUpdate | undefined,
  row: SessionUpdate,
): boolean {
  return Boolean(known && known.revision >= row.revision);
}

export function keepNewerRevisions(
  held: readonly SessionUpdate[],
  incoming: readonly SessionUpdate[],
): readonly SessionUpdate[] {
  const byId = new Map(held.map((row) => [row.id, row]));
  let changed = false;

  for (const row of incoming) {
    if (isAlreadyHeld(byId.get(row.id), row)) continue;
    byId.set(row.id, row);
    changed = true;
  }

  return orderedRevisions(byId, changed, held);
}

export function startCursor(rows: readonly SessionUpdate[]): number | null {
  return rows[0]?.position ?? null;
}

function orderedRevisions(
  byId: Map<string, SessionUpdate>,
  changed: boolean,
  held: readonly SessionUpdate[],
): readonly SessionUpdate[] {
  return changed ? [...byId.values()].sort(byPosition) : held;
}
