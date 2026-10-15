import type * as React from 'react';
import { Platform, View } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/buttons/icon-button';
import { narrowPairs } from './header-button-pairing';

export interface HeaderButtonProps extends Pick<
  IconButtonProps,
  'ref' | 'accessibilityState'
> {
  onPress?: () => void;
  icon: IconName;
  accessibilityLabel: string;
  // Paired trailing items are 32pt wide, except on Android; a lone item fills its 44pt slot.
  paired?: boolean;
  // A dot on the icon: Sessions need attention, or a filter other than the default is set.
  dot?: 'attention' | 'filter';
}

interface HeaderButtonFit {
  hitSlop: IconButtonProps['hitSlop'];
  // A square that replaces IconButton's own size classes.
  size: string;
  // A narrower item keeps the square's height; a style width overrides the class on every platform.
  style?: { width: number };
  dotPlace: string;
}

const headerButtonFits = {
  // iOS 26 pads each item into a glass bubble, so a 24pt item matches the system search bubble.
  glass: {
    hitSlop: 10,
    size: 'size-6 sm:size-6',
    dotPlace: '-top-0.5 -right-0.5',
  },
  narrow: {
    hitSlop: { left: 6, right: 6 },
    size: 'size-11 sm:size-11',
    style: { width: 32 },
    dotPlace: 'top-2.5 right-1',
  },
  slot: {
    hitSlop: undefined,
    size: 'size-11 sm:size-11',
    dotPlace: 'top-2.5 right-[9px]',
  },
} satisfies Record<string, HeaderButtonFit>;

const dotColors = {
  attention: 'bg-warning',
  filter: 'bg-foreground',
} satisfies Record<NonNullable<HeaderButtonProps['dot']>, string>;

const pairedFit = narrowPairs ? headerButtonFits.narrow : headerButtonFits.slot;

function headerButtonFit(paired: boolean): HeaderButtonFit {
  if (hasLiquidGlass) return headerButtonFits.glass;

  return paired ? pairedFit : headerButtonFits.slot;
}

// The header fit replaces IconButton's touch minimum, border and focus outline with the header's own.
const headerChrome =
  'rounded-full p-0 border-0 min-h-0 min-w-0 android:min-h-0 android:min-w-0 web:transition-all dark:active:bg-hover/50 web:dark:hover:bg-hover/50 web:focus-visible:outline-none web:focus-visible:ring-[3px] web:focus-visible:ring-focus/50';

// A list's filter in a phone header: Android's top app bar draws Material's filter list, as Paper does; iOS keeps the sliders.
export const headerFilterIcon: IconName =
  Platform.OS === 'android' ? 'filter-list' : 'filters';

// A plain icon button for a native header; the platform draws any chrome around it.
export function HeaderButton(props: HeaderButtonProps): React.JSX.Element {
  const { paired = false, dot, ...buttonProps } = props;
  const fit = headerButtonFit(paired);

  return (
    <IconButton
      hitSlop={fit.hitSlop}
      style={fit.style}
      {...buttonProps}
      variant="ghost"
      iconRole="action"
      className={cn(headerChrome, fit.size)}
      badge={headerDot(dot, fit)}
    />
  );
}

function headerDot(
  dot: HeaderButtonProps['dot'],
  fit: HeaderButtonFit,
): React.JSX.Element | undefined {
  if (!dot) return undefined;

  return <HeaderButtonDot color={dotColors[dot]} place={fit.dotPlace} />;
}

function HeaderButtonDot(props: {
  color: string;
  place: string;
}): React.JSX.Element {
  return (
    <View
      testID="header-button-dot"
      className={cn(
        'absolute size-[7px] rounded-full border-[1.5px] border-background',
        props.color,
        props.place,
      )}
    />
  );
}
