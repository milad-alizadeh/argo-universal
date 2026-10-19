import { isSubmenu, type DeclaredEntry } from './declared-entry';

// An entry under a new id; a submenu's Actions move under it too, so two submenus never share one.
export function withId(entry: DeclaredEntry, id: string): DeclaredEntry {
  if (!isSubmenu(entry)) return { ...entry, id };
  const previous = `${entry.id}/`;

  return {
    ...entry,
    id,
    sections: entry.sections.map((section) => ({
      ...section,
      actions: section.actions.map((action) => ({
        ...action,
        id: `${id}/${action.id.slice(previous.length)}`,
      })),
    })),
  };
}
