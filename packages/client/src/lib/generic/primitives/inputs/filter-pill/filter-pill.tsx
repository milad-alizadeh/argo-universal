import type * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import {
  type FilterPillProps,
  filterPillLabel,
  filterPillSpokenLabel,
} from './filter-pill-props';

// The web's filter: one toolbar pill with its count; the chosen one uses the primary fill.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={filterPillSpokenLabel(props)}
      aria-pressed={props.selected}
      onPress={props.onPress}
      className={pillClass(props.selected)}
    >
      <Text role="control" className={pillTextClass(props.selected)}>
        {filterPillLabel(props)}
      </Text>
    </Pressable>
  );
}

const pillClass = (selected: boolean): string =>
  cn(
    'h-7 flex-row items-center gap-1.5 rounded-full px-3',
    selected
      ? 'bg-primary active:bg-primary/77 web:hover:bg-primary/67 web:active:bg-primary/77'
      : 'web:hover:bg-hover active:bg-pressed',
  );

const pillTextClass = (selected: boolean): string =>
  cn(selected ? 'text-primary-foreground' : 'text-muted-foreground');
