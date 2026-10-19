import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

// Android and web draw a grouped List as segments: small inner corners and a gap instead of separators.
const groupedCorners = {
  only: 'rounded-grouped web:wide:rounded-3xl',
  first:
    'rounded-t-grouped web:wide:rounded-t-3xl android:rounded-b-grouped-inner android:mb-0.5 web:rounded-b-grouped-inner web:mb-0.5',
  middle:
    'android:rounded-grouped-inner android:mb-0.5 web:rounded-grouped-inner web:mb-0.5',
  last: 'rounded-b-grouped web:wide:rounded-b-3xl android:rounded-t-grouped-inner web:rounded-t-grouped-inner',
} satisfies Record<ListPosition, string>;

const appearanceClasses = {
  plain: '',
  grouped: 'bg-card',
  cards:
    'mb-2 rounded-grouped bg-card web:wide:rounded-3xl web:wide:bg-transparent web:wide:shadow-hairline',
};

function corners(
  appearance: ListAppearance,
  position: ListPosition,
): string | undefined {
  return appearance === 'grouped' ? groupedCorners[position] : undefined;
}

export function itemSurface(
  appearance: ListAppearance,
  position: ListPosition,
  { tone }: Pick<ListItemProps, 'tone'>,
): string {
  return cn(
    'relative overflow-hidden',
    tone !== 'muted' && appearanceClasses[appearance],
    corners(appearance, position),
  );
}

export const itemPress = cn(
  'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5 web:select-none web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
  Platform.OS !== 'android' && 'active:bg-pressed',
);

// Only iOS draws separators; Android and web leave rows apart.
function hasSeparator(
  appearance: ListAppearance,
  position: ListPosition,
): boolean {
  return (
    Platform.OS === 'ios' &&
    appearance !== 'cards' &&
    ['first', 'middle'].includes(position)
  );
}

export function itemSeparator(
  appearance: ListAppearance,
  position: ListPosition,
  leading: boolean,
): string | undefined {
  if (!hasSeparator(appearance, position)) return undefined;

  return cn(
    'absolute bottom-0 right-4 left-4 bg-border',
    leading && 'left-14 wide:left-15',
  );
}
