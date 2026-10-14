import type * as React from 'react';
import { Icon } from '../../../symbols/icon';
import type { IconName } from '../../../symbols/icon-names';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';
import { Pressable, contentActionClass } from '../../pressable/pressable';

export interface NavigationItemProps {
  title: string;
  icon: IconName;
  selected: boolean;
  // A count that needs attention, drawn by the caller, and what a screen reader says for it.
  badge?: { element: React.ReactElement; label: string };
  onPress: () => void;
}

// A destination in a navigation drawer: an icon and a label, tinted and filled when it is the current one.
export function NavigationItem(props: NavigationItemProps): React.JSX.Element {
  const { title, selected, onPress } = props;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      role="button"
      className={navigationItemClass(selected)}
    >
      <NavigationItemContent {...props} />
    </Pressable>
  );
}

const navigationItemClass = (selected: boolean): string =>
  contentActionClass({
    variant: 'ghost',
    className: cn(
      'h-12 sm:h-12 justify-start gap-1.5 rounded-lg px-3 has-[>[data-icon]]:px-3',
      selected && 'bg-selected',
    ),
  });

function NavigationItemContent(props: NavigationItemProps): React.JSX.Element {
  const { title, icon, selected, badge } = props;
  const muted = cn(!selected && 'text-muted-foreground');
  const label = cn('flex-1', selected && 'font-semibold');

  return (
    <>
      <Icon name={icon} role="nav" filled={selected} className={muted} />
      <Text role="body" className={label}>
        {title}
      </Text>
      <OptionalBadge badge={badge} />
    </>
  );
}

function OptionalBadge({
  badge,
}: Pick<NavigationItemProps, 'badge'>): React.ReactElement | null {
  return badge?.element ?? null;
}
