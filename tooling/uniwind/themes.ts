import amberMinimal from './themes/amber-minimal.json';
import chalk from './themes/chalk.json';
import claymorphism from './themes/claymorphism.json';
import defaultTheme from './themes/default.json';
import meridian from './themes/meridian.json';
import stillwater from './themes/stillwater.json';
import vercel from './themes/vercel.json';
import warmEditorial from './themes/warm-editorial.json';

export const themes = [
  { id: 'default', label: 'Default', variables: defaultTheme },
  { id: 'meridian', label: 'Meridian', variables: meridian },
  { id: 'stillwater', label: 'Stillwater', variables: stillwater },
  { id: 'vercel', label: 'Vercel', variables: vercel },
  { id: 'chalk', label: 'Chalk', variables: chalk },
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
