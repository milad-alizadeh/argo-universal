import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ComposerConfigurationProps } from './composer-configuration/composer-configuration';

// The app presents Composer menus as native sheet routes through these.
export interface NativeSheets {
  // The Agent and model menu, with its own stack of pages.
  agentModel: () => void;
}

const NativeSheetsContext = createContext<NativeSheets | undefined>(undefined);

export const NativeSheetsProvider = NativeSheetsContext.Provider;

export function useNativeSheets(): NativeSheets | undefined {
  return useContext(NativeSheetsContext);
}

// The sheet routes sit outside the Composer, so the Composer hands them what to draw.
function createStore<Value>(): {
  publish: (value: Value) => void;
  current: () => Value | undefined;
  use: () => Value | undefined;
} {
  let latest: Value | undefined;
  const listeners = new Set<() => void>();
  return {
    publish: (value) => {
      latest = value;
      for (const listener of listeners) listener();
    },
    current: () => latest,
    use: () =>
      useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return (): void => {
            listeners.delete(listener);
          };
        },
        () => latest,
      ),
  };
}

const configurationStore = createStore<ComposerConfigurationProps>();
export const publishAgentModelConfiguration = configurationStore.publish;
export const useAgentModelConfiguration = configurationStore.use;
