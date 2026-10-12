import type * as React from 'react';
import { Platform, View } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import type { IconButtonProps } from '../generic/primitives/buttons/icon-button/icon-button';
import {
  Pressable,
  contentActionClass,
} from '../generic/primitives/pressable/pressable';
import { Icon } from '../generic/symbols/icon';

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

// A plain icon button for a native header; the platform draws any chrome around it.
export function HeaderButton({
  icon,
  accessibilityLabel,
  paired: pairedProp = false,
  dot,
  ...props
}: HeaderButtonProps): React.JSX.Element {
  // Android: a menu's native host clips hitSlop, so every item keeps the full 44pt target.
  const paired = pairedProp && Platform.OS !== 'android';
  const narrow = paired || hasLiquidGlass;
  let hitSlop: IconButtonProps['hitSlop'];
  if (hasLiquidGlass) hitSlop = 10;
  else if (paired) hitSlop = { left: 6, right: 6 };
  const content = (
    <>
      <Icon size="md" name={icon} className="text-foreground" />
      {dot && (
        <View
          testID="header-button-dot"
          className={cn(
            'absolute size-[7px] rounded-full border-[1.5px] border-background',
            dot === 'attention' ? 'bg-warning' : 'bg-foreground',
            hasLiquidGlass
              ? '-top-0.5 -right-0.5'
              : cn('top-2.5', narrow ? 'right-1' : 'right-[9px]'),
          )}
        />
      )}
    </>
  );
  return (
    <Pressable
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      {...props}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'rounded-full p-0',
          // iOS 26 pads each item into a glass bubble, so a 24pt item matches the system search bubble.
          hasLiquidGlass
            ? 'size-6 sm:size-6'
            : cn('h-11 sm:h-11', paired ? 'w-8 sm:w-8' : 'w-11 sm:w-11'),
        ),
      })}
    >
      {content}
    </Pressable>
  );
}
