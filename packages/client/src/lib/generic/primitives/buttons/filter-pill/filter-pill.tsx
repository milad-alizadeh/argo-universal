import type * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '#primitives/display/text';
import { cn } from '../../../utils';
import { type FilterPillProps, filterPillText } from './filter-pill-props';

// Desktop and web: Argo's own pill, on the primary fill when on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <Pressable
      role="button"
      {...pillProps(props)}
      aria-pressed={props.value}
      onPress={() => props.onValueChange(!props.value)}
    >
      <Text role="control" className={pillTextClass(props.value)}>
        {filterPillText(props).join(' ')}
      </Text>
    </Pressable>
  );
}

function pillProps(
  props: FilterPillProps,
): React.ComponentProps<typeof Pressable> {
  return {
    accessibilityLabel: filterPillText(props).join(', '),
    disabled: props.disabled,
    className: pillClass(props),
  };
}

const pillClass = ({ value, disabled }: FilterPillProps): string =>
  cn(
    'h-7 flex-row items-center gap-1.5 rounded-full px-3',
    value ? 'bg-primary' : offHover(disabled),
    disabled && 'opacity-50',
  );

// An off pill shows the selected tint under the pointer, unless it is disabled.
const offHover = (disabled?: boolean): string | undefined =>
  disabled ? undefined : 'web:hover:bg-selected';

const pillTextClass = (value: boolean): string =>
  value ? 'text-primary-foreground' : 'text-muted-foreground';

FilterPill satisfies React.ComponentType<FilterPillProps>;
