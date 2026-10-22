import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { Platform, View, type ViewProps } from 'react-native';

export interface HeaderButtonProps {
  ref?: React.ComponentProps<typeof View>['ref'];
  accessibilityState?: ViewProps['accessibilityState'];
  onPress?: () => void;
  icon: IconName;
  accessibilityLabel: string;
  // Paired trailing items are 32pt wide; a lone item fills its 44pt slot.
  paired?: boolean;
  // A dot on the icon: Sessions need attention, or a filter other than the default is set.
  dot?: 'attention' | 'filter';
}

interface HeaderButtonFit {
  dot: HeaderButtonDotProps['on'];
}

const headerButtonFits = {
  narrow: { dot: 'paired' },
  slot: { dot: 'lone' },
} satisfies Record<string, HeaderButtonFit>;

// Where the dot sits over the icon of each button that carries one.
const dotPlaces = {
  paired: 'top-2.5 right-1',
  lone: 'top-2.5 right-2.25',
  small: 'top-1 right-1',
} as const;

const dotColors = {
  attention: 'bg-warning',
  filter: 'bg-foreground',
} satisfies Record<NonNullable<HeaderButtonProps['dot']>, string>;

function headerButtonFit(paired: boolean): HeaderButtonFit {
  return paired ? headerButtonFits.narrow : headerButtonFits.slot;
}

// A list's filter in a phone header: Android's top app bar draws Material's filter list, as Paper does; iOS and the web keep the sliders.
export const headerFilterIcon: Extract<IconName, 'filter-list' | 'filters'> =
  Platform.OS === 'android' ? 'filter-list' : 'filters';

// A plain icon button for Android's drawer header and the web's JS header; iOS headers use stock bar button items.
export function HeaderButton({
  ref,
  paired = false,
  dot,
  ...props
}: HeaderButtonProps): React.JSX.Element {
  return (
    <View ref={ref}>
      <IconButton variant="ghost" {...buttonProps(props)} />
      {headerDot(dot, headerButtonFit(paired))}
    </View>
  );
}

function headerDot(
  dot: HeaderButtonProps['dot'],
  fit: HeaderButtonFit,
): React.JSX.Element | undefined {
  if (!dot) return undefined;

  return <HeaderButtonDot dot={dot} on={fit.dot} />;
}

interface HeaderButtonDotProps {
  dot: NonNullable<HeaderButtonProps['dot']>;
  // The button it sits on: a paired or lone header item, or a wide window's small icon button.
  on: keyof typeof dotPlaces;
}

// The dot a header button draws, also for a wide window's small icon button that carries the same state.
function HeaderButtonDot(props: HeaderButtonDotProps): React.JSX.Element {
  return (
    <View
      testID="header-button-dot"
      className={cn(
        'absolute size-1.75 rounded-full border-2 border-card',
        dotColors[props.dot],
        dotPlaces[props.on],
      )}
    />
  );
}

interface ListHeaderButtonProps {
  ref?: React.ComponentProps<typeof View>['ref'];
  accessibilityState?: ViewProps['accessibilityState'];
  onPress?: () => void;
  icon: IconName;
  accessibilityLabel: string;
  dot?: HeaderButtonProps['dot'];
}

// A wide window's list header action, such as the Sessions view menu's trigger: a small ghost button with a header button's dot (Paper "SessionsList").
export function ListHeaderButton({
  ref,
  dot,
  ...props
}: ListHeaderButtonProps): React.JSX.Element {
  return (
    <View ref={ref}>
      <IconButton variant="ghost" size="sm" {...buttonProps(props)} />
      {dot && <HeaderButtonDot dot={dot} on="small" />}
    </View>
  );
}

const buttonProps = (
  props: Pick<ListHeaderButtonProps, 'icon' | 'accessibilityLabel' | 'onPress'>,
): Pick<IconButtonProps, 'icon' | 'accessibilityLabel' | 'onPress'> => ({
  icon: props.icon,
  accessibilityLabel: props.accessibilityLabel,
  onPress: props.onPress,
});

// A header's trailing items in one row, for a header option that takes a single element.
export function HeaderItems({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <View className="flex-row items-center gap-1">{children}</View>;
}
