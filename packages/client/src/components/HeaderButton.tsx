import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { hasLiquidGlass } from '#lib/native-header';
import { cn } from '#lib/utils';
import { Button, type ButtonProps } from '#primitives/button';
import { Icon } from './Icon';

export interface HeaderButtonProps
  extends Pick<ButtonProps, 'ref' | 'accessibilityState'> {
  onPress?: () => void;
  icon: PhosphorIcon;
  accessibilityLabel: string;
  // Paired trailing items are 32pt wide; a lone item fills its 44pt slot.
  paired?: boolean;
  // The header's leading item; Android draws its glyph at the slot's edge, the screen inset.
  leading?: boolean;
  // A dot on the icon: Sessions need attention, or a filter other than the default is set.
  dot?: 'attention' | 'filter';
}

// A plain icon button for a native header; the platform draws any chrome around it.
export function HeaderButton({
  icon,
  accessibilityLabel,
  paired = false,
  leading = false,
  dot,
  ...props
}: HeaderButtonProps) {
  const narrow = paired || hasLiquidGlass;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full',
        // iOS 26 pads each item into a glass bubble, so a 24pt item matches the system search bubble.
        hasLiquidGlass
          ? 'size-6 sm:size-6'
          : cn(
              'h-11 sm:h-11',
              paired ? 'w-8 sm:w-8' : 'w-11 sm:w-11',
              leading && 'android:justify-start',
            ),
      )}
      // Keeps a 44pt touch target.
      hitSlop={hasLiquidGlass ? 10 : paired ? { left: 6, right: 6 } : undefined}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      <Icon as={icon} className="size-5 text-foreground" />
      {dot && (
        <View
          testID="header-button-dot"
          className={cn(
            'absolute size-[7px] rounded-full border-[1.5px] border-background',
            dot === 'attention' ? 'bg-warning' : 'bg-foreground',
            hasLiquidGlass
              ? '-top-0.5 -right-0.5'
              : cn(
                  'top-2.5',
                  narrow ? 'right-1' : 'right-[9px]',
                  leading && 'android:right-[21px]',
                ),
          )}
        />
      )}
    </Button>
  );
}
