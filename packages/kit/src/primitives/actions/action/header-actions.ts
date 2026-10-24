import {
  isDanger,
  type ActionGroup,
  type DeclaredAction,
  type DeclaredEntry,
  type DeclaredSubmenu,
} from './action-declarations';

// An Argo-drawn header shows up to three safe Actions; with more, two and the overflow menu.
export const headerSlots = 3;

// A header button is an icon, so only an Action with one becomes a button; a submenu always has one.
export type IconAction = DeclaredAction & {
  icon: NonNullable<DeclaredAction['icon']>;
};

export type HeaderEntry = IconAction | DeclaredSubmenu;

export interface HeaderActionSplit {
  // Buttons and submenus in the header, in declared order.
  direct: HeaderEntry[];
  // The overflow (•••) menu, its groups keeping their Section titles; a submenu here opens as a nested menu.
  overflow: ActionGroup[];
}

/*
 * The one rule for a header's Actions on every platform. `groups` come from `orderedGroups`, so danger Actions are
 * already their own last group. Danger Actions and Actions without an icon are never in the header itself. When every entry is safe and fits the
 * slots, all are in the header; otherwise the first safe entries, submenus among them in declared order, fill every
 * slot but one, and the last opens the overflow menu with the rest, where a submenu nests its Sections.
 */
export function splitHeaderActions(
  groups: ActionGroup[],
  slots: number,
): HeaderActionSplit {
  const all = groups.flatMap((group) => group.actions);
  const safe = all.filter(headerEntry);
  const direct = safe.slice(0, directCount(all.length, safe.length, slots));

  return { direct, overflow: remainingGroups(groups, direct) };
}

const headerEntry = (entry: DeclaredEntry): entry is HeaderEntry =>
  !isDanger(entry) && entry.icon !== undefined;

export const isIconAction = (action: DeclaredAction): action is IconAction =>
  action.icon !== undefined;

function directCount(total: number, safe: number, slots: number): number {
  if (safe === total && total <= slots) return total;

  return Math.max(0, slots - 1);
}

// The entries not in the header, each group keeping its title; a group left empty drops out.
function remainingGroups(
  groups: ActionGroup[],
  direct: readonly DeclaredEntry[],
): ActionGroup[] {
  return groups.flatMap((group) => {
    const actions = group.actions.filter((entry) => !direct.includes(entry));

    return actions.length ? [{ ...group, actions }] : [];
  });
}
