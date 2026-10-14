import type * as React from 'react';
import { View } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import type { IconButtonProps } from '#primitives/buttons/icon-button/icon-button';
import { Icon } from '#primitives/display/icon/icon';
import { Pressable, contentActionClass } from '#primitives/pressable/pressable';
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
  size: string;
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
    size: 'h-11 sm:h-11 w-8 sm:w-8',
    dotPlace: 'top-2.5 right-1',
  },
  slot: {
    hitSlop: undefined,
    size: 'h-11 sm:h-11 w-11 sm:w-11',
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

function headerButtonClass(size: string): string {
  return contentActionClass({
    variant: 'ghost',
    className: cn('rounded-full p-0', size),
  });
}

// A plain icon button for a native header; the platform draws any chrome around it.
export function HeaderButton(props: HeaderButtonProps): React.JSX.Element {
  const { icon, paired = false, dot, ...pressableProps } = props;
  const fit = headerButtonFit(paired);

  return (
    <Pressable
      hitSlop={fit.hitSlop}
      {...pressableProps}
      role="button"
      className={headerButtonClass(fit.size)}
    >
      <Icon role="action" name={icon} className="text-foreground" />
      {dot && <HeaderButtonDot color={dotColors[dot]} place={fit.dotPlace} />}
    </Pressable>
  );
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
