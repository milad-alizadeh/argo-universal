import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

// Whether this Device lets Agents and the voice see its screen: a Device preference, never the Account's, and off until the person turns it on.
const storageKey = 'screen-sight-enabled';

export async function loadScreenSightEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey)) === 'true';
  } catch (cause) {
    console.error('Could not load the screen sight preference', cause);

    return false;
  }
}

// The desktop App refuses every capture until told this Device turned screen sight on, so it hears each change.
const desktopScreen = (): NonNullable<Window['argo']>['screen'] =>
  globalThis.window?.argo?.screen;

export const tellDesktop = (enabled: boolean): void =>
  desktopScreen()?.setEnabled(enabled);

async function saveScreenSightEnabled(enabled: boolean): Promise<void> {
  tellDesktop(enabled);

  try {
    await AsyncStorage.setItem(storageKey, String(enabled));
  } catch (cause) {
    console.error('Could not remember the screen sight preference', cause);
  }
}

const preference = queryOptions({
  queryKey: ['screen-sight-enabled'],
  queryFn: loadScreenSightEnabled,
  staleTime: Infinity,
  networkMode: 'always',
});

type ScreenSightPreference = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

// The seam a Settings switch will use once one is designed: no screen shows it yet.
export function useScreenSightEnabled(): ScreenSightPreference {
  const client = useQueryClient();
  const enabled = useQuery(preference).data ?? false;

  return {
    enabled,
    setEnabled: (next) => {
      client.setQueryData(preference.queryKey, next);
      void saveScreenSightEnabled(next);
    },
  };
}
