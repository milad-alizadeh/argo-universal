import AsyncStorage from '@react-native-async-storage/async-storage';

// Appearance's three themes: System follows the Device, Light and Dark override it.
export const themeChoices = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export type ThemeChoice = (typeof themeChoices)[number]['value'];

// What a Device draws until it chooses.
const defaultThemeChoice: ThemeChoice = 'system';

const storageKey = 'theme-choice';

let writes = Promise.resolve();

function asThemeChoice(value: string | null): ThemeChoice {
  return (
    themeChoices.find((choice) => choice.value === value)?.value ??
    defaultThemeChoice
  );
}

// The theme this Device chose last; System until it chooses, or when its storage cannot be read.
export async function loadThemeChoice(): Promise<ThemeChoice> {
  await writes;

  try {
    return asThemeChoice(await AsyncStorage.getItem(storageKey));
  } catch (cause) {
    console.error('Could not load the theme', cause);

    return defaultThemeChoice;
  }
}

// Kept on this Device, never on the Server (ADR-0022: Appearance is a Device setting).
export function saveThemeChoice(choice: ThemeChoice): void {
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, choice))
    .catch((cause: unknown) => {
      console.error('Could not remember the theme', cause);
    });
}
