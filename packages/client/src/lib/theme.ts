import { toNativeTokenValue } from '@repo/uniwind/native-token-values';
import {
  getThemeVariables,
  type ThemeId,
  type ThemeMode,
} from '@repo/uniwind/themes';
import { Platform } from 'react-native';
import { Uniwind } from 'uniwind';

export function applyTheme(themeId: ThemeId, mode: ThemeMode) {
  for (const themeMode of ['light', 'dark'] as const) {
    const variables = Object.fromEntries(
      Object.entries(getThemeVariables(themeId, themeMode)).flatMap(
        ([name, value]) => {
          if (Platform.OS !== 'web' && name.startsWith('font-')) return [];
          const property = /^(font-|shadow|radius|letter-spacing|spacing)/.test(
            name,
          )
            ? `--${name}`
            : `--color-${name}`;
          return [
            [
              property,
              Platform.OS === 'web'
                ? value
                : toNativeTokenValue(property, value),
            ],
          ];
        },
      ),
    );
    Uniwind.updateCSSVariables(themeMode, variables);
  }
  Uniwind.setTheme(mode);
}
