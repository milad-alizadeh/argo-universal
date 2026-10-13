import {
  DarkTheme,
  DefaultTheme,
  type Theme,
} from 'expo-router/react-navigation';
import { useCSSVariable, useUniwind } from 'uniwind';

type NavigationColors = Theme['colors'];
type NavigationColor = NavigationColors['text'];

const colorOr = (value: unknown, fallback: NavigationColor): NavigationColor =>
  typeof value === 'string' ? value : fallback;

function navigationColors(
  values: readonly unknown[],
  baseline: NavigationColors,
): NavigationColors {
  const [background, border, card, notification, primary, text] = values;
  return {
    background: colorOr(background, baseline.background),
    border: colorOr(border, baseline.border),
    card: colorOr(card, baseline.card),
    notification: colorOr(notification, baseline.notification),
    primary: colorOr(primary, baseline.primary),
    text: colorOr(text, baseline.text),
  };
}

export function useNavigationTheme(): Theme {
  const { theme } = useUniwind();
  const baseline = theme === 'dark' ? DarkTheme : DefaultTheme;
  const values = useCSSVariable([
    // Screens and native headers sit on the App's one content surface.
    '--color-sidebar',
    '--color-border',
    '--color-sidebar',
    '--color-destructive',
    '--color-primary',
    '--color-foreground',
  ]);
  return { ...baseline, colors: navigationColors(values, baseline.colors) };
}
