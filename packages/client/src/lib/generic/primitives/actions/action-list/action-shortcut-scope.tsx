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

export function ActionShortcutScope({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [scope] = useState(() => new ShortcutRegistry());

  return <ShortcutScope value={scope}>{children}</ShortcutScope>;
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
  useSyncExternalStore(scope.subscribe, scope.snapshot, scope.snapshot);
  useShortcutListener({ ...options, scope, id });

  return {
    id,
    actions: hintedActions(options.actions, scope, id),
  };
}

function useRegistration(
  scope: ShortcutRegistry,
  id: string,
  { actions, plugin }: ShortcutOptions,
): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    return scope.register({ id, actions, plugin });
  }, [scope, id, actions, plugin]);
}

function hintedActions(
  actions: DeclaredAction[],
  scope: ShortcutRegistry,
  id: string,
): DeclaredAction[] {
  return actions.map((action) => ({
    ...action,
    shortcut: scope.owns(id, action) ? action.shortcut : undefined,
  }));
}
