import type { DeclaredAction } from '#primitives/actions/action-list';

export function headerActions(
  actions: DeclaredAction[],
  slots: number,
): HeaderActions {
  const safe = actions.filter((action) => action.tone !== 'danger');
  const count = directCount(actions.length, safe.length, slots);
  const direct = safe.slice(0, count);

  return {
    direct,
    overflow: actions.filter((action) => !direct.includes(action)),
  };
}

interface HeaderActions {
  direct: DeclaredAction[];
  overflow: DeclaredAction[];
}

function directCount(total: number, safe: number, slots: number): number {
  if (total <= slots && safe === total) return slots;

  return Math.max(0, slots - 1);
}
