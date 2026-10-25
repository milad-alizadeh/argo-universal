import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { Platform, View } from 'react-native';

// A dot on the icon while a filter other than the default is set.
type HeaderDot = 'filter';

const dotColors = {
  filter: 'bg-foreground',
} satisfies Record<HeaderDot, string>;

// A list's filter in a phone header: Android's top app bar draws Material's filter list, as Paper does; iOS and the web keep the sliders.
export const headerFilterIcon: Extract<IconName, 'filter-list' | 'filters'> =
  Platform.OS === 'android' ? 'filter-list' : 'filters';

type ListHeaderButtonProps = Omit<IconButtonProps, 'variant' | 'size'> & {
  ref?: React.ComponentProps<typeof View>['ref'];
  dot?: HeaderDot;
};

// A wide window's list header action, such as the Sessions view menu's trigger: a small ghost button with a dot (Paper "SessionsList").
export function ListHeaderButton({
  ref,
  dot,
  ...props
}: ListHeaderButtonProps): React.JSX.Element {
  return (
    <View ref={ref}>
      <IconButton variant="ghost" size="sm" {...props} />
      {dot && <HeaderButtonDot dot={dot} />}
    </View>
  );
}

function HeaderButtonDot({ dot }: { dot: HeaderDot }): React.JSX.Element {
  return (
    <View
      testID="header-button-dot"
      className={cn(
        'absolute top-1 right-1 size-1.75 rounded-full border-2 border-card',
        dotColors[dot],
      )}
    />
  );
}
