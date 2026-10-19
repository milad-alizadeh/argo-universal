import type { PressActionProps, SubmenuActionProps } from './action-list-props';

export type DeclaredAction = PressActionProps & { id: string };

// A submenu Section's Actions, each with an id under the submenu's.
export interface DeclaredSection {
  title?: string;
  actions: DeclaredAction[];
}

export type DeclaredSubmenu = Omit<SubmenuActionProps, 'children'> & {
  id: string;
  sections: DeclaredSection[];
};

export type DeclaredEntry = DeclaredAction | DeclaredSubmenu;

export interface ActionGroup<Entry extends DeclaredEntry = DeclaredEntry> {
  boundary?: boolean;
  title?: string;
  actions: Entry[];
}

export function isSubmenu(entry: DeclaredEntry): entry is DeclaredSubmenu {
  return 'sections' in entry;
}

export function isPress(entry: DeclaredEntry): entry is DeclaredAction {
  return !isSubmenu(entry);
}

export const isDanger = (entry: DeclaredEntry): boolean =>
  isPress(entry) && entry.tone === 'danger';

// The Actions a press or a shortcut runs: the press Actions and every submenu's Actions.
export function pressActions(entries: DeclaredEntry[]): DeclaredAction[] {
  return entries.flatMap((entry) =>
    isSubmenu(entry)
      ? entry.sections.flatMap((section) => section.actions)
      : [entry],
  );
}
