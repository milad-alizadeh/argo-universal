import type { TextInputProps } from '@expo/ui';
import { font } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import type { Tone } from '#primitives/content/text';

type CodeFace = Pick<TextInputProps, 'textStyle'> & {
  modifiers: NonNullable<TextInputProps['modifiers']>;
};

// Code asks only for the mono face, at the platform's own body size: SwiftUI takes it as a font design, Compose as a font family.
export function codeFace(code: boolean | undefined): CodeFace {
  if (code !== true) return { modifiers: [] };

  return Platform.OS === 'ios'
    ? { modifiers: [font({ textStyle: 'body', design: 'monospaced' })] }
    : { textStyle: { fontFamily: 'monospace' }, modifiers: [] };
}

// Danger keeps its Argo token on both native platforms.
export function useDangerColor(tone: Tone | undefined): string | undefined {
  const color = useNativeTheme().colors.danger;

  return tone === 'danger' ? color : undefined;
}
