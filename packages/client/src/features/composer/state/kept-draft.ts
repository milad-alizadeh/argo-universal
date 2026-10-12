import AsyncStorage from '@react-native-async-storage/async-storage';

let writes = Promise.resolve();

// The draft text this Device kept under a key; empty when none was kept or the read failed.
export async function loadKeptDraft(key: string): Promise<string> {
  await writes;
  const kept = await AsyncStorage.getItem(key).catch((error: unknown) => {
    console.error('Could not load the Composer draft', error);
    return null;
  });
  return kept ?? '';
}

// Keeps the draft text on this Device in write order; an empty draft is forgotten.
export function keepDraft(key: string, text: string): void {
  writes = writes
    .then(() =>
      text ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key),
    )
    .catch((error: unknown) => {
      console.error('Could not keep the Composer draft', error);
    });
}
