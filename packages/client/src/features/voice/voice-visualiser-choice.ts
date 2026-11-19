import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  defaultVisualiser,
  voiceVisualiserKind,
  type VoiceVisualiserKind,
} from './components/voice-visualiser/voice-visualiser-kind';

const storageKey = 'voice-visualiser';

let writes = Promise.resolve();

const parsed = (stored: string | null): VoiceVisualiserKind => {
  if (stored === null) return defaultVisualiser;

  try {
    return voiceVisualiserKind.parse(JSON.parse(stored));
  } catch {
    return defaultVisualiser;
  }
};

// The visualiser this Device chose last; the orb until it chooses, or when its storage cannot be read.
export async function loadVoiceVisualiser(): Promise<VoiceVisualiserKind> {
  await writes;

  try {
    return parsed(await AsyncStorage.getItem(storageKey));
  } catch (cause) {
    console.error('Could not load the voice visualiser', cause);

    return defaultVisualiser;
  }
}

// Kept on this Device, never on the Server, as the microphone and speaker are.
export function saveVoiceVisualiser(kind: VoiceVisualiserKind): void {
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(kind)))
    .catch((cause: unknown) =>
      console.error('Could not remember the voice visualiser', cause),
    );
}

const preference = queryOptions({
  queryKey: ['voice-visualiser'],
  queryFn: loadVoiceVisualiser,
  staleTime: Infinity,
  networkMode: 'always',
});

type VisualiserPreference = {
  kind: VoiceVisualiserKind;
  choose: (kind: VoiceVisualiserKind) => void;
};

export function useVoiceVisualiser(): VisualiserPreference {
  const client = useQueryClient();

  return {
    kind: useQuery(preference).data ?? defaultVisualiser,
    choose: (kind) => {
      client.setQueryData(preference.queryKey, kind);
      saveVoiceVisualiser(kind);
    },
  };
}
