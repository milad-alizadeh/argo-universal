import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { ControlHost } from '#primitives/native/native-control';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { useWide } from '../../../use-wide/use-wide';
import { type FilterPillProps, filterPillText } from './filter-pill-props';
import { FilterPill as WideFilterPill } from './filter-pill.tsx';

// A phone's filter is Material 3's own FilterChip in the Host's colours, leading with the check mark while on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  if (useWide()) return <WideFilterPill {...props} />;

  return (
    <ControlHost matchContents>
      <FilterChip
        selected={props.selected}
        onClick={props.onPress}
        modifiers={chipModifiers(props)}
      >
        <ChipContent {...props} />
      </FilterChip>
    </ControlHost>
  );
}

const chipModifiers = (
  props: FilterPillProps,
): React.ComponentProps<typeof FilterChip>['modifiers'] => [
  semantics({ contentDescription: filterPillText(props).join(', ') }),
];

function ChipContent(props: FilterPillProps): React.JSX.Element {
  return (
    <>
      <FilterChip.Label>
        <Text>{filterPillText(props).join(' ')}</Text>
      </FilterChip.Label>
      <SelectedCheck selected={props.selected} />
    </>
  );
}

function SelectedCheck({
  selected,
}: Pick<FilterPillProps, 'selected'>): React.JSX.Element | null {
  if (!selected) return null;

  return (
    <FilterChip.LeadingIcon>
      <NativeSymbol name="check" role="control" />
    </FilterChip.LeadingIcon>
  );
}

FilterPill satisfies React.ComponentType<FilterPillProps>;
