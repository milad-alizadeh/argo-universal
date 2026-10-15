import type { TextProps } from '@expo/ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { useNativeTextExceptions } from '#primitives/native/native-typography';
import type { GroupedListItemProps } from './grouped-list-item-props';

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

function swiftColor(tone: RowTone): ReturnType<typeof foregroundStyle>[] {
  const color = swiftColors[tone];

  return color === undefined ? [] : [foregroundStyle({ type: 'color', color })];
}

// Row-specific hierarchy stays here; repeated code/danger exceptions belong to native text.
export function useRowText(
  code: boolean | undefined,
  tone: RowTone,
): Pick<TextProps, 'textStyle' | 'modifiers'> {
  const text = useNativeTextExceptions({ code, danger: tone === 'danger' });

  if (Platform.OS !== 'ios') return text;

  return { modifiers: [...swiftColor(tone), ...(text.modifiers ?? [])] };
}
