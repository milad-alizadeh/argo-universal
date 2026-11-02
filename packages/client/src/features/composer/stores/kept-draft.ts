import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftKey } from '../utils/draft-key';

export interface KeptDrafts {
  load: (key: DraftKey) => Promise<string>;
  keep: (key: DraftKey, text: string) => void;
  forgetSent: (key: DraftKey, sent: string) => void;
}

// Draft text kept on this Device, written in order; a read waits for the writes before it.
export function keptDraftsOnDevice(): KeptDrafts {
  let writes = Promise.resolve();

  const load = async (key: DraftKey): Promise<string> => {
    await writes;

    return (await AsyncStorage.getItem(key).catch(loadFailed)) ?? '';
  };

  const write = (change: () => Promise<void>): void => {
    writes = writes.then(change).catch(keepFailed);
  };

  return {
    load,
    keep: (key, text) => write(() => writeText(key, text)),
    forgetSent: (key, sent) => write(() => removeUnlessEdited(key, sent)),
  };
}

const writeText = (key: DraftKey, text: string): Promise<void> =>
  text ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key);

// Text written since the send is a newer draft, and stays.
async function removeUnlessEdited(key: DraftKey, sent: string): Promise<void> {
  if ((await AsyncStorage.getItem(key)) === sent)
    await AsyncStorage.removeItem(key);
}

function loadFailed(cause: unknown): null {
  console.error('Could not load the Composer draft', cause);

  return null;
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Composer draft', cause);
}

export const keptDrafts = keptDraftsOnDevice();
