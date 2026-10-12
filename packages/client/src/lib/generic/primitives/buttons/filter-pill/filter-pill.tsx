import type * as React from 'react';
import { Pressable } from 'react-native';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';

export interface FilterPillProps {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}

const pillName = ({ label, count }: FilterPillProps): string[] =>
  count === undefined ? [label] : [label, String(count)];

// One filter in a toolbar, with its count; the chosen one sits on the selected fill.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  const name = pillName(props);
  return (
    <Pressable
      role="button"
      accessibilityLabel={name.join(', ')}
      aria-pressed={props.selected}
      onPress={props.onPress}
      className={cn(
        'h-7 flex-row items-center gap-1.5 rounded-full px-3 web:hover:bg-selected',
        props.selected && 'bg-selected',
      )}
    >
      <Text
        role="control"
        className={cn(!props.selected && 'text-muted-foreground')}
      >
        {name.join(' ')}
      </Text>
    </Pressable>
  );
}
