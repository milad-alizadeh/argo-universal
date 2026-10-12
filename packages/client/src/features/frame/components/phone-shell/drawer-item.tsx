import type * as React from 'react';
import { Badge } from '#lib/generic/primitives/display/badge/badge';
import { Text } from '#lib/generic/primitives/display/text/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import {
  Pressable,
  contentActionClass,
} from '../../../../lib/generic/primitives/pressable/pressable';
import { Icon } from '../../../../lib/generic/symbols/icon';

export interface DrawerItemProps {
  title: string;
  icon: IconName;
  selected: boolean;
  // The Sessions that need attention, such as "3".
  badge?: { text: string; label: string };
  onPress: () => void;
}

// A section's row in the phone drawer.
export function DrawerItem({
  title,
  icon,
  selected,
  badge,
  onPress,
}: DrawerItemProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'h-12 sm:h-12 justify-start gap-1.5 rounded-lg px-3 has-[>[data-icon]]:px-3',
          selected && 'bg-selected',
        ),
      })}
    >
      <Icon
        name={icon}
        size="lg"
        filled={selected}
        className={cn(!selected && 'text-muted-foreground')}
      />
      <Text role="body" className={cn('flex-1', selected && 'font-semibold')}>
        {title}
      </Text>
      {badge && <DrawerBadge badge={badge} />}
    </Pressable>
  );
}

export function DrawerBadge({
  badge,
}: Required<Pick<DrawerItemProps, 'badge'>>): React.JSX.Element {
  return (
    <Badge
      className="h-phone-shell-badge min-w-phone-shell-badge border-0 bg-warning px-1.5"
      accessibilityLabel={badge.label}
    >
      <Text role="badge" className="text-warning-foreground">
        {badge.text}
      </Text>
    </Badge>
  );
}
