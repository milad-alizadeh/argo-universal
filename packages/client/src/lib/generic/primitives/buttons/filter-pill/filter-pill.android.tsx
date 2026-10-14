import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Host } from '#primitives/native/host';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { type FilterPillProps, filterPillText } from './filter-pill-props';

// Android: Material's own FilterChip in its default colours, with the check mark when on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <Host matchContents>
      <FilterChip
        {...chipProps(props)}
        onClick={() => props.onValueChange(!props.value)}
      >
        <FilterChip.Label>
          <Text>{filterPillText(props).join(' ')}</Text>
        </FilterChip.Label>
        {props.value && <CheckIcon />}
      </FilterChip>
    </Host>
  );
}

function chipProps(
  props: FilterPillProps,
): Omit<React.ComponentProps<typeof FilterChip>, 'children'> {
  return {
    selected: props.value,
    enabled: !props.disabled,
    modifiers: [
      semantics({ contentDescription: filterPillText(props).join(', ') }),
    ],
  };
}

// Material's check mark, leading the label while the chip is on.
function CheckIcon(): React.JSX.Element {
  return (
    <FilterChip.LeadingIcon>
      <NativeSymbol name="check" role="control" />
    </FilterChip.LeadingIcon>
  );
}

FilterPill satisfies React.ComponentType<FilterPillProps>;
