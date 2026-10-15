import type * as React from 'react';
import { contentActionClass } from '#primitives/buttons/button';
import { CountBadge } from '#primitives/display/count-badge';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { cn } from '../../../utils';
import type { DrawerItemProps } from './drawer-item-props';

// A destination in a navigation drawer: an icon and a label, tinted and filled when it is the current one.
export function DrawerItem(props: DrawerItemProps): React.JSX.Element {
  const { label, selected, onPress } = props;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      role="button"
      className={drawerItemClass(selected)}
    >
      <DrawerItemContent {...props} />
    </Pressable>
  );
}

const drawerItemClass = (selected: boolean): string =>
  contentActionClass({
    variant: 'ghost',
    className: cn(
      'h-12 sm:h-12 justify-start gap-1.5 rounded-lg px-3 has-[>[data-icon]]:px-3',
      selected && 'bg-selected',
    ),
  });

function DrawerItemContent(props: DrawerItemProps): React.JSX.Element {
  const { label, icon, selected } = props;
  const muted = cn(!selected && 'text-muted-foreground');
  const labelClass = cn('flex-1', selected && 'font-semibold');

  return (
    <>
      <Icon name={icon} role="nav" filled={selected} className={muted} />
      <Text role="body" className={labelClass}>
        {label}
      </Text>
      <CountBadge badge={props.badge} />
    </>
  );
}

DrawerItem satisfies React.ComponentType<DrawerItemProps>;
