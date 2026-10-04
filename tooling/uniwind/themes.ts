import amberMinimal from './themes/amber-minimal.json';
import claymorphism from './themes/claymorphism.json';
import defaultTheme from './themes/default.json';
import linear from './themes/linear.json';
import warmEditorial from './themes/warm-editorial.json';

export const themes = [
  { id: 'default', label: 'Default', variables: defaultTheme },
  { id: 'linear', label: 'Linear', variables: linear },
  { id: 'amber-minimal', label: 'Amber Minimal', variables: amberMinimal },
  { id: 'claymorphism', label: 'Claymorphism', variables: claymorphism },
  { id: 'warm-editorial', label: 'Claude', variables: warmEditorial },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type ThemeMode = 'light' | 'dark';

export function getThemeVariables(themeId: ThemeId, mode: ThemeMode) {
  const selected = themes.find((theme) => theme.id === themeId) ?? themes[0];
  return {
    ...defaultTheme.light,
    ...defaultTheme[mode],
    ...selected.variables.light,
    ...selected.variables[mode],
  };
}
