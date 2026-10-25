import type { ActionShortcut } from '#primitives/content/kbd';

export type { ActionShortcut } from '#primitives/content/kbd';

export const reservedShortcuts: readonly ActionShortcut[] = [
  ...['q', 'w', 'h', 'm', 'z', 'x', 'c', 'v', 'a', 'r', '0', '+', '-'].map(
    (key) => ({ modifiers: ['meta'] as const, key }),
  ),
  ...['z', 'v', 'r', '/'].map((key) => ({
    modifiers: ['meta', 'shift'] as const,
    key,
  })),
  ...['h', 'i'].map((key) => ({ modifiers: ['meta', 'alt'] as const, key })),
  { modifiers: ['meta', 'ctrl'], key: 'f' },
  { modifiers: [], key: 'Enter' },
  { modifiers: [], key: 'Escape' },
];

export function shortcutId(
  shortcut: ActionShortcut,
  primary: 'meta' | 'ctrl' = 'meta',
): string {
  return (
    canonicalModifiers(shortcut, primary).join('+') +
    ':' +
    shortcut.key.toLowerCase()
  );
}

function canonicalModifiers(
  shortcut: ActionShortcut,
  primary: 'meta' | 'ctrl',
): string[] {
  return [
    ...new Set(
      shortcut.modifiers.map((modifier) =>
        modifier === 'meta' ? primary : modifier,
      ),
    ),
  ].sort();
}

export function isReserved(
  shortcut: ActionShortcut,
  primary: 'meta' | 'ctrl' = 'meta',
): boolean {
  const id = shortcutId(shortcut, primary);

  return reservedShortcuts.some(
    (reserved) => shortcutId(reserved, primary) === id,
  );
}

interface ShortcutPolicy {
  plugin: boolean;
  primary: 'meta' | 'ctrl';
}

interface ShortcutDeclaration {
  shortcut?: ActionShortcut;
  disabled?: boolean;
  plugin?: boolean;
}

export function resolveShortcuts(
  actions: readonly ShortcutDeclaration[],
  plugin = false,
  primary: 'meta' | 'ctrl' = 'meta',
): (ActionShortcut | undefined)[] {
  const claimed = new Set<string>();

  return actions.map((action) =>
    claimShortcut(
      allowedShortcut(action, { plugin, primary }),
      claimed,
      primary,
    ),
  );
}

function allowedShortcut(
  action: ShortcutDeclaration,
  options: ShortcutPolicy,
): ActionShortcut | undefined {
  if (!action.shortcut) return;

  if (pluginDeclaration(options.plugin, action))
    return pluginShortcut(action.shortcut, options.primary);

  return action.shortcut;
}

function claimShortcut(
  shortcut: ActionShortcut | undefined,
  claimed: Set<string>,
  primary: 'meta' | 'ctrl',
): ActionShortcut | undefined {
  if (!shortcut) return;
  const id = shortcutId(shortcut, primary);

  if (claimed.has(id)) return;
  claimed.add(id);

  return shortcut;
}

function pluginShortcut(
  shortcut: ActionShortcut,
  primary: 'meta' | 'ctrl',
): ActionShortcut | undefined {
  return isReserved(shortcut, primary) ? undefined : shortcut;
}

function pluginDeclaration(
  plugin: boolean,
  action: ShortcutDeclaration,
): boolean {
  return plugin || Boolean(action.plugin);
}
