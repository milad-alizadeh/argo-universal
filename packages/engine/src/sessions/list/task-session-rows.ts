import type { SessionRecord } from '@repo/contracts';

export function taskSessionRoots(
  tasks: ReadonlySet<string>,
  rows: readonly SessionRecord[],
): (row: SessionRecord) => string | undefined {
  const byId = new Map(rows.map((row) => [row.id, row]));

  return (row) => {
    const visited = new Set<string>();
    let current: SessionRecord | undefined = row;

    while (
      current?.projectId === row.projectId &&
      !tasks.has(current.id) &&
      !visited.has(current.id)
    ) {
      visited.add(current.id);
      current = byId.get(current.startedBySessionId ?? '');
    }

    return current?.projectId === row.projectId && tasks.has(current.id)
      ? current.id
      : undefined;
  };
}
