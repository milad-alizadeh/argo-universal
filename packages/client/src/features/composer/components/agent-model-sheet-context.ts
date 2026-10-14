import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ComposerConfigurationProps } from './composer-configuration/composer-configuration';

// The app presents Composer menus as native sheet routes through these.
export interface NativeSheets {
  // The Agent and model menu, with its own stack of pages; absent where the Composer's own sheet shows it.
  agentModel?: () => void;
}

const NativeSheetsContext = createContext<NativeSheets | undefined>(undefined);

export const NativeSheetsProvider = NativeSheetsContext.Provider;

export function useNativeSheets(): NativeSheets | undefined {
  return useContext(NativeSheetsContext);
}

// The sheet routes sit outside the Composer, so the Composer hands them what to draw.
interface PublishedStore<Value> {
  publish: (value: Value) => void;
  current: () => Value | undefined;
  use: () => Value | undefined;
}

function subscribeTo(
  listeners: Set<() => void>,
): (listener: () => void) => () => void {
  return (listener) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  };
}

function createStore<Value>(): PublishedStore<Value> {
  let latest: Value | undefined;
  const listeners = new Set<() => void>();
  const subscribe = subscribeTo(listeners);
  const current = (): Value | undefined => latest;

  const publish = (value: Value): void => {
    latest = value;

    for (const listener of listeners) listener();
  };

  return {
    publish,
    current,
    use: () => useSyncExternalStore(subscribe, current),
  };
}

const configurationStore = createStore<ComposerConfigurationProps>();

export const publishAgentModelConfiguration = configurationStore.publish;

export const useAgentModelConfiguration = configurationStore.use;
