import { useNativeTheme } from '../native-theme';
import type { ListItemProps } from './field-props';
import type { TextRole } from './text';

// A code title or subtitle draws in the mono face.
export const titleRole = (code: boolean | undefined): TextRole =>
  code ? 'code' : 'body';
export const subtitleRole = (subtitle: ListItemProps['subtitle']): TextRole =>
  subtitle?.code ? 'code' : 'secondary';

// The native colour a toned row's title draws in; none for a plain row.
export function useToneColor(tone: ListItemProps['tone']): string | undefined {
  const { destructive, tint, mutedForeground } = useNativeTheme().colors;
  return tone && { destructive, accent: tint, muted: mutedForeground }[tone];
}
