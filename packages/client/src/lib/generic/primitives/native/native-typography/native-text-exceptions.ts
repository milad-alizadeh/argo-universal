import type { TextProps } from '@expo/ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { useNativeTheme } from '../../../native-theme';

type TextAppearance = Pick<TextProps, 'textStyle' | 'modifiers'>;

interface TextExceptions {
  code?: boolean;
  danger?: boolean;
}

// Native text inherits its container's metrics; only code and failure text opt out.
export function useNativeTextExceptions(
  options: TextExceptions,
): TextAppearance {
  const { danger } = useNativeTheme().colors;
  const color = options.danger ? danger : undefined;

  if (Platform.OS === 'ios') return swiftExceptions(options.code, color);

  return androidExceptions(options.code, color);
}

// A semantic body style keeps mono text in Dynamic Type; a design-only font fixes it at 17pt.
function swiftExceptions(
  code: boolean | undefined,
  color: string | undefined,
): TextAppearance {
  return {
    modifiers: [
      ...(code ? [font({ textStyle: 'body', design: 'monospaced' })] : []),
      ...(color ? [foregroundStyle(color)] : []),
    ],
  };
}

function androidExceptions(
  code: boolean | undefined,
  color: string | undefined,
): TextAppearance {
  return { textStyle: { fontFamily: code ? 'monospace' : undefined, color } };
}
