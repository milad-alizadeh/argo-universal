import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftKey } from './draft-key';

export interface KeptDrafts {
  load: (key: DraftKey) => Promise<string>;
  keep: (key: DraftKey, text: string) => void;
}

// Draft text kept on this Device, written in order; a read waits for the writes before it.
export function keptDraftsOnDevice(): KeptDrafts {
  let writes = Promise.resolve();
  return {
    // Empty when none was kept or the read failed.
    load: async (key) => {
      await writes;
      const kept = await AsyncStorage.getItem(key).catch((error: unknown) => {
        console.error('Could not load the Composer draft', error);
        return null;
      });
      return kept ?? '';
    },
    // An empty draft is forgotten.
    keep: (key, text) => {
      writes = writes
        .then(() =>
          text ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key),
        )
        .catch((error: unknown) => {
          console.error('Could not keep the Composer draft', error);
        });
    },
  };
}

export const keptDrafts = keptDraftsOnDevice();
