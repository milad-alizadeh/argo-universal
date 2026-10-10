import type { ReactNode } from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ComposerConfigurationProps } from './composer-configuration';

// The app presents Composer menus as native sheet routes through these.
export interface NativeSheets {
  // The Agent and model menu, with its own stack of pages.
  agentModel: () => void;
  // Any other Composer menu, as one page.
  content: () => void;
  close: () => void;
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

interface SheetContent {
  // Which menu drew it, so only that menu keeps it current.
  owner: string;
  label: string;
  render: (close: (after?: () => void) => void) => ReactNode;
}
const contentStore = createStore<SheetContent>();
export const publishSheetContent = contentStore.publish;
export const currentSheetContent = contentStore.current;
export const useSheetContent = contentStore.use;
