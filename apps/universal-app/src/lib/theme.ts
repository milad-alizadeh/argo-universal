import {
  DarkTheme,
  DefaultTheme,
  type Theme,
} from 'expo-router/react-navigation';
import { useCSSVariable, useUniwind } from 'uniwind';

export function useNavigationTheme(): Theme {
  const { theme } = useUniwind();
  const baseline = theme === 'dark' ? DarkTheme : DefaultTheme;
  const [background, border, card, notification, primary, text] =
    useCSSVariable([
      '--color-background',
      '--color-border',
      '--color-card',
      '--color-destructive',
      '--color-primary',
      '--color-foreground',
    ]) as (string | undefined)[];
  return {
    ...baseline,
    colors: {
      background: background ?? baseline.colors.background,
      border: border ?? baseline.colors.border,
      card: card ?? baseline.colors.card,
      notification: notification ?? baseline.colors.notification,
      primary: primary ?? baseline.colors.primary,
      text: text ?? baseline.colors.text,
    },
  };
}
