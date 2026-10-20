import { useCallback, useEffect, useState } from 'react';
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
    choice: hasAdaptiveThemes ? 'system' : lightOrDark(theme),
    choose,
  };
}

function lightOrDark(theme: string): ThemeChoice {
  return theme === 'dark' ? 'dark' : 'light';
}

/*
 * At App start, draws the theme this Device chose last. False until storage has answered, so the App can hold its
 * first screen rather than flash the system theme.
 */
export function useRestoredThemeChoice(): boolean {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    void loadThemeChoice().then((choice) => {
      Uniwind.setTheme(choice);
      setRestored(true);
    });
  }, []);

  return restored;
}
