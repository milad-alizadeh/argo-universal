import type { TextRole } from '#primitives/display/text';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListItemProps } from './grouped-list-item-props';

// A code title or subtitle draws in the mono face.
export const titleRole = (code: boolean | undefined): TextRole =>
  code ? 'code' : 'body';

export const subtitleRole = (
  subtitle: GroupedListItemProps['subtitle'],
): TextRole => (subtitle?.code ? 'code' : 'secondary');

// The native colour a toned row's title draws in; none for a plain row.
export function useToneColor(
  tone: GroupedListItemProps['tone'],
): string | undefined {
  const { danger, accent, mutedForeground } = useNativeTheme().colors;

  return tone && { destructive: danger, accent, muted: mutedForeground }[tone];
}
