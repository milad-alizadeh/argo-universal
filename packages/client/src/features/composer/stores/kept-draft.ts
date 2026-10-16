import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftKey } from '../utils/draft-key';

export interface KeptDrafts {
  load: (key: DraftKey) => Promise<string>;
  keep: (key: DraftKey, text: string) => void;
}

// Draft text kept on this Device, written in order; a read waits for the writes before it.
export function keptDraftsOnDevice(): KeptDrafts {
  let writes = Promise.resolve();

  const load = async (key: DraftKey): Promise<string> => {
    await writes;

    return (await AsyncStorage.getItem(key).catch(loadFailed)) ?? '';
  };

  const keep = (key: DraftKey, text: string): void => {
    writes = writes
      .then(() =>
        text ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key),
      )
      .catch(keepFailed);
  };

  return { load, keep };
}

function loadFailed(cause: unknown): null {
  console.error('Could not load the Composer draft', cause);

  return null;
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Composer draft', cause);
}

export const keptDrafts = keptDraftsOnDevice();
