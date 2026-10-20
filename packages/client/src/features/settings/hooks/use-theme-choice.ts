import { useCallback } from 'react';
import { Uniwind, useUniwind } from 'uniwind';
import {
  loadThemeChoice,
  saveThemeChoice,
  type ThemeChoice,
} from '../stores/theme-choice';

type ThemeChoiceState = {
  choice: ThemeChoice;
  choose: (choice: ThemeChoice) => void;
};

// The theme Uniwind draws, and a choice that applies at once and is kept for the next start.
export function useThemeChoice(): ThemeChoiceState {
  const { theme, hasAdaptiveThemes } = useUniwind();

  const choose = useCallback((choice: ThemeChoice) => {
    Uniwind.setTheme(choice);
    saveThemeChoice(choice);
  }, []);

  return {
    choice: hasAdaptiveThemes ? 'system' : asFixedTheme(theme),
    choose,
  };
}

function asFixedTheme(theme: string): ThemeChoice {
  return theme === 'dark' ? 'dark' : 'light';
}

// At App start, draws the theme this Device chose last.
export async function restoreThemeChoice(): Promise<void> {
  const choice = await loadThemeChoice();

  if (choice !== 'system') Uniwind.setTheme(choice);
}
