import {
  DarkTheme,
  DefaultTheme,
  type Theme,
} from 'expo-router/react-navigation';
import { useCSSVariable, useUniwind } from 'uniwind';

type NavigationColors = Theme['colors'];

type NavigationColor = NavigationColors['text'];

// What `useCSSVariable` reads: a string on web, a string or number on native.
type CSSVariableValue = string | number | undefined;

const colorOr = (
  value: CSSVariableValue,
  fallback: NavigationColor,
): NavigationColor => (typeof value === 'string' ? value : fallback);

function navigationColors(
  values: readonly CSSVariableValue[],
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
    '--color-content',
    '--color-border',
    '--color-content',
    '--color-destructive',
    '--color-primary',
    '--color-foreground',
  ]);

  return { ...baseline, colors: navigationColors(values, baseline.colors) };
}
