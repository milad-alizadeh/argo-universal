import type { SessionListContext, SessionListState } from './machine';

export function refreshSessionList(
  context: SessionListContext,
): SessionListState {
  const ids = dirtyIds(context);
  const changed = changedRows(context, ids);

  const cache = new Map(
    cachedRows(context).map((row): [string, SessionListState[number]] => [
      row.information.sessionId,
      row,
    ]),
  );

  removeRelated(context, cache, ids);
  mergeChanged(cache, changed);

  return [...cache.values()];
}

function cachedRows(context: SessionListContext): SessionListState {
  return context.dirty === null ? [] : (context.rows ?? []);
}

function changedRows(
  context: SessionListContext,
  ids: string[] | null,
): SessionListState {
  if (context.dirty === null) return context.readRows();

  return readDirty(context, ids);
}

function dirtyIds(context: SessionListContext): string[] | null {
  return context.dirty && context.relatedSessionIds([...context.dirty]);
}

function removeRelated(
  context: SessionListContext,
  cache: Map<string, SessionListState[number]>,
  ids: string[] | null,
): void {
  for (const id of context.relatedSessionIds(ids ?? [])) cache.delete(id);
}

function mergeChanged(
  cache: Map<string, SessionListState[number]>,
  changed: SessionListState,
): void {
  for (const row of changed) cache.set(row.information.sessionId, row);
}

function readDirty(
  context: SessionListContext,
  ids: string[] | null,
): SessionListState {
  return context.dirty?.size ? context.readRows(idsOrEmpty(ids)) : [];
}

function idsOrEmpty(ids: string[] | null): string[] {
  return ids ?? [];
}
