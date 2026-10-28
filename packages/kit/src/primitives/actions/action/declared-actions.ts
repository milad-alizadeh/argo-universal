import { useMemo, type ReactNode } from 'react';
import { usePluginTree } from '#kit/plugin-tree-context';
import {
  actionGroups,
  isPress,
  orderedGroups,
  pressActions,
  type ActionGroup,
  type DeclaredAction,
  type DeclaredEntry,
} from './action-declarations';
import {
  useActionShortcuts,
  type ShortcutOptions,
} from './action-shortcut-scope';

export interface DeclaredActions {
  // Ordered by `orderedGroups`, each Action showing its shortcut only while this declaration owns it.
  groups: ActionGroup[];
  // The id of the node whose subtree the shortcuts of these Actions run in.
  id: string;
  actions: DeclaredAction[];
}

export interface DeclarationOptions {
  // Its shortcuts run only while focus is inside the node carrying the declaration's `id`.
  context?: boolean;
  // Argo itself declared these Actions, as a List's refresh and Move Section are, so they keep Argo's reserved keys.
  builtIn?: boolean;
}

/*
 * Reads an `actions` Slot's Actions and Sections, and claims their shortcuts in the enclosing scope. Inside a Plugin's
 * tree they cannot claim Argo's reserved keys, unless Argo itself declared them.
 */
export function useDeclaredActions(
  declared: ReactNode,
  options: DeclarationOptions = {},
): DeclaredActions {
  const groups = useMemo(() => actionGroups(declared), [declared]);
  const plugin = useIsPlugin(options.builtIn === true);
  const context = options.context === true;
  const { id, actions } = useGroupShortcuts(groups, { context, plugin });

  const owned = ownedShortcuts(actions);
  const hinted = useMemo(() => hintedGroups(groups, owned), [groups, owned]);

  return { groups: hinted, id, actions };
}

// Whether these Actions are a Plugin's, so they cannot claim Argo's reserved keys.
function useIsPlugin(builtIn: boolean): boolean {
  const inPluginTree = usePluginTree();

  return inPluginTree && !builtIn;
}

function useGroupShortcuts(
  groups: ActionGroup[],
  options: Pick<ShortcutOptions, 'context' | 'plugin'>,
): ReturnType<typeof useActionShortcuts> {
  const declarations = useMemo(
    () => pressActions(groups.flatMap((group) => group.actions)),
    [groups],
  );

  return useActionShortcuts({ actions: declarations, ...options });
}

// A string, so the groups only change when the shortcuts this declaration owns do.
function ownedShortcuts(actions: DeclaredAction[]): string {
  return actions
    .flatMap((action) => (action.shortcut ? [action.id] : []))
    .join(' ');
}

function hintedGroups(groups: ActionGroup[], owned: string): ActionGroup[] {
  const shortcuts = new Set(owned.split(' '));

  return orderedGroups(
    groups.map((group) => ({
      ...group,
      actions: group.actions.map((entry) => hinted(entry, shortcuts)),
    })),
  );
}

// A submenu's Actions keep their hints too, since they hold shortcuts of their own.
function hinted(entry: DeclaredEntry, shortcuts: Set<string>): DeclaredEntry {
  if (isPress(entry)) return ownHint(entry, shortcuts);

  return {
    ...entry,
    sections: entry.sections.map((section) => ({
      ...section,
      actions: section.actions.map((action) => ownHint(action, shortcuts)),
    })),
  };
}

// An Action shows its shortcut only while this declaration owns it.
const ownHint = (
  action: DeclaredAction,
  shortcuts: Set<string>,
): DeclaredAction =>
  shortcuts.has(action.id) ? action : { ...action, shortcut: undefined };
