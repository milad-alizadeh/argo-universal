import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

// The microphone and speaker a call uses on this Device; null follows the system's choice.
const conversationDeviceChoice = z.object({
  microphone: z.string().nullable(),
  speaker: z.string().nullable(),
});

export type ConversationDeviceChoice = z.infer<typeof conversationDeviceChoice>;

export const systemDevices: ConversationDeviceChoice = {
  microphone: null,
  speaker: null,
};

const storageKey = 'voice-devices';

let writes = Promise.resolve();

const parsed = (stored: string | null): ConversationDeviceChoice => {
  if (stored === null) return systemDevices;

  try {
    return conversationDeviceChoice.parse(JSON.parse(stored));
  } catch {
    return systemDevices;
  }
};

// The devices this Device chose last; the system's until it chooses, or when its storage cannot be read.
export async function loadConversationDeviceChoice(): Promise<ConversationDeviceChoice> {
  await writes;

  try {
    return parsed(await AsyncStorage.getItem(storageKey));
  } catch (cause) {
    console.error('Could not load the voice devices', cause);

    return systemDevices;
  }
}

// Kept on this Device, never on the Server: another Device has other microphones and speakers.
export function saveVoiceDeviceChoice(choice: ConversationDeviceChoice): void {
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(choice)))
    .catch((cause: unknown) =>
      console.error('Could not remember the voice devices', cause),
    );
}

const preference = queryOptions({
  queryKey: ['voice-devices'],
  queryFn: loadConversationDeviceChoice,
  staleTime: Infinity,
  networkMode: 'always',
});

type DeviceChoicePreference = {
  choice: ConversationDeviceChoice;
  choose: (change: Partial<ConversationDeviceChoice>) => void;
};

export function useConversationDeviceChoice(): DeviceChoicePreference {
  const client = useQueryClient();
  const choice = useQuery(preference).data ?? systemDevices;

  return {
    choice,
    choose: (change) => {
      const next = { ...choice, ...change };
      client.setQueryData(preference.queryKey, next);
      saveVoiceDeviceChoice(next);
    },
  };
}
