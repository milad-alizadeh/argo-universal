import type { TextInputProps } from '@expo/ui';
import { font } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { Tone } from '#primitives/content/text';
import { toneClass } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

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

// Explicit text tones use public Compose colour props; untoned text inherits its native container.
export function useTextColor(tone: Tone | undefined): string | undefined {
  const color = usePrimitiveColor(toneClass(tone) ?? 'text-foreground');

  return tone === undefined ? undefined : color;
}
