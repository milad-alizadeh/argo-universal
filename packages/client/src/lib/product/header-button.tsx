import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/buttons/icon-button';

export interface HeaderButtonProps extends Pick<
  IconButtonProps,
  'ref' | 'accessibilityState'
> {
  onPress?: () => void;
  icon: IconName;
  accessibilityLabel: string;
  // Paired trailing items are 32pt wide; a lone item fills its 44pt slot.
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

function headerButtonFit(paired: boolean): HeaderButtonFit {
  return paired ? headerButtonFits.narrow : headerButtonFits.slot;
}

// The header fit replaces IconButton's touch minimum, border and focus outline with the header's own.
const headerChrome =
  'rounded-full p-0 border-0 min-h-0 min-w-0 android:min-h-0 android:min-w-0 web:transition-all dark:active:bg-muted/50 web:dark:hover:bg-muted/50 web:focus-visible:outline-none web:focus-visible:ring-3 web:focus-visible:ring-focus/50';

// A list's filter in a phone header: Android's top app bar draws Material's filter list, as Paper does; iOS and the web keep the sliders.
export const headerFilterIcon: Extract<IconName, 'filter-list' | 'filters'> =
  Platform.OS === 'android' ? 'filter-list' : 'filters';

// A plain icon button for Android's drawer header and the web's JS header; iOS headers use stock bar button items.
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
        'absolute size-1.75 rounded-full border-[1.5px] border-card',
        props.color,
        props.place,
      )}
    />
  );
}

// A header's trailing items in one row, for a header option that takes a single element.
export function HeaderItems({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <View className="flex-row items-center gap-1">{children}</View>;
}
