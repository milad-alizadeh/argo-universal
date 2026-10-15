import type * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '#primitives/display/text';
import { cn } from '../../../utils';
import type { FilterPillProps } from './filter-pill-props';

const pillName = ({ label, count }: FilterPillProps): string[] =>
  count === undefined ? [label] : [label, String(count)];

// One filter in a toolbar, with its count; the chosen one sits on the selected fill.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={pillName(props).join(', ')}
      aria-pressed={props.selected}
      onPress={props.onPress}
      className={pillClass(props.selected)}
    >
      <Text role="control" className={pillTextClass(props.selected)}>
        {pillName(props).join(' ')}
      </Text>
    </Pressable>
  );
}

const pillClass = (selected: boolean): string =>
  cn(
    'h-7 flex-row items-center gap-1.5 rounded-full px-3 active:bg-pressed web:hover:bg-hover',
    selected && 'bg-selected',
  );

const pillTextClass = (selected: boolean): string =>
  cn(!selected && 'text-muted-foreground');
