import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { DeclaredAction } from './action-declarations';
import { useShortcutListener } from './shortcut-listener';
import { ShortcutRegistry } from './shortcut-registry';

const ShortcutScope = createContext(new ShortcutRegistry());

// A new scope, or an existing one carried into a tree its owner doesn't render, such as a navigator's header.
export function ActionShortcutScope(props: {
  scope?: ShortcutRegistry;
  children: ReactNode;
}): React.JSX.Element {
  const [own] = useState(() => new ShortcutRegistry());

  return (
    <ShortcutScope value={props.scope ?? own}>{props.children}</ShortcutScope>
  );
}

export function useActionShortcutScope(): ShortcutRegistry {
  return useContext(ShortcutScope);
}

export interface ShortcutOptions {
  actions: DeclaredAction[];
  plugin: boolean;
  context: boolean;
}

interface ShortcutAllocation {
  id: string;
  actions: DeclaredAction[];
}

export function useActionShortcuts(
  options: ShortcutOptions,
): ShortcutAllocation {
  const scope = useContext(ShortcutScope);
  const id = useId();
  useRegistration(scope, id, options);
  // A declaration draws again only when the keys it holds change, not for every other declaration's.
  const ownedBy = (): string => scope.ownedBy(id);
  const owned = useSyncExternalStore(scope.subscribe, ownedBy, ownedBy);
  useShortcutListener({ ...options, scope, id });

  return { id, actions: hintedActions(options.actions, owned) };
}

function useRegistration(
  scope: ShortcutRegistry,
  id: string,
  { actions, plugin, context }: ShortcutOptions,
): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    return scope.register({ id, actions, plugin, context });
  }, [scope, id, actions, plugin, context]);
}

// Hinted from the keys it holds as read, never from the registry itself, so a compiled draw cannot keep stale hints.
function hintedActions(
  actions: DeclaredAction[],
  owned: string,
): DeclaredAction[] {
  const ids = new Set(owned.split('\n'));

  return actions.map((action) => ({
    ...action,
    shortcut: ids.has(action.id) ? action.shortcut : undefined,
  }));
}
