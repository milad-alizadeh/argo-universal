import type { TextProps } from '@expo/ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import type { TextRole } from '#primitives/display/text';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListItemProps } from './grouped-list-item-props';

// A code title or subtitle draws in the mono face.
export const titleRole = (code: boolean | undefined): TextRole =>
  code ? 'code' : 'body';

export const subtitleRole = (
  subtitle: GroupedListItemProps['subtitle'],
): TextRole => (subtitle?.code ? 'code' : 'secondary');

export type RowTone =
  | 'primary'
  | 'secondary'
  | NonNullable<GroupedListItemProps['tone']>;

/*
 * iOS's system label colours, as a Form's button would tint its whole label; an accent row takes that tint.
 * Android keeps the Host palette's content colour for every tone but danger.
 */
const swiftColors: Partial<Record<RowTone, string>> = {
  primary: 'label',
  secondary: 'secondaryLabel',
  muted: 'secondaryLabel',
};

function swiftColor(
  tone: RowTone,
  danger: string | undefined,
): ReturnType<typeof foregroundStyle>[] {
  const color = danger ?? swiftColors[tone];

  return color === undefined ? [] : [foregroundStyle({ type: 'color', color })];
}

/*
 * A Form row's text keeps the List's own font, which scales with Dynamic Type: the title and value
 * the body style, a subtitle the subheadline under it, and code the same style in the mono design.
 */
const swiftFonts: Partial<Record<TextRole, ReturnType<typeof font>>> = {
  secondary: font({ textStyle: 'subheadline' }),
  code: font({ textStyle: 'body', design: 'monospaced' }),
};

const swiftFont = (role: TextRole): ReturnType<typeof font>[] => {
  const style = swiftFonts[role];

  return style === undefined ? [] : [style];
};

// A failure reads in the danger token, the one colour native text takes from Argo's theme rather than the Host.
export function useDangerColor(tone: string | undefined): string | undefined {
  const { danger } = useNativeTheme().colors;

  return tone === 'danger' ? danger : undefined;
}

// A native row's text in its role: SwiftUI's in the List's own text styles, Compose's from the universal style.
export function useRowText(
  role: TextRole,
  tone: RowTone,
): Pick<TextProps, 'textStyle' | 'modifiers'> {
  const textStyle = useUniversalTextStyle(role);
  const danger = useDangerColor(tone);

  if (Platform.OS !== 'ios')
    return { textStyle: { ...textStyle, color: danger } };

  return { modifiers: [...swiftFont(role), ...swiftColor(tone, danger)] };
}
