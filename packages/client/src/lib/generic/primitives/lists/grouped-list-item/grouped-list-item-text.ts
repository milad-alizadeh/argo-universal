import {
  font,
  foregroundStyle,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import type { NativeTextProps } from '#primitives/display/native-text';
import type { GroupedListItemProps } from './grouped-list-item-props';

type Modifiers = NonNullable<NativeTextProps['modifiers']>;

export type RowTone =
  | 'primary'
  | 'secondary'
  | NonNullable<GroupedListItemProps['tone']>;

const ios = Platform.OS === 'ios';

/*
 * iOS's system label colours, as a Form's button would tint its whole label; an accent row takes that tint.
 * Android's NativeText and ListItem take colours through their public APIs.
 */
const swiftColors: Partial<Record<RowTone, string>> = {
  primary: 'label',
  secondary: 'secondaryLabel',
  muted: 'secondaryLabel',
};

export function rowColor(tone: RowTone): Modifiers {
  const color = ios ? swiftColors[tone] : undefined;

  return color === undefined ? [] : [foregroundStyle({ type: 'color', color })];
}

// A Form row's subtitle reads in the subheadline style under the List's body text, which scales with Dynamic Type.
export const subtitleModifiers: Modifiers = ios
  ? [font({ textStyle: 'subheadline' }), ...rowColor('secondary')]
  : [];

// A path keeps its start and its last folder, as Finder shortens a long name in the middle; Compose's Text only ellipsizes the end.
export const codeTruncation: Modifiers = ios ? [truncationMode('middle')] : [];
