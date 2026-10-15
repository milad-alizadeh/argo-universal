import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { ControlHost } from '#primitives/native/native-control';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { filterPillFor } from './filter-pill-phone';
import { type FilterPillProps, filterPillLabel } from './filter-pill-props';

// Material 3's FilterChip in Argo's colours, with a check mark while on.
function PhoneChip(props: FilterPillProps): React.JSX.Element {
  return (
    <ControlHost matchContents>
      <FilterChip
        selected={props.selected}
        onClick={props.onPress}
        colors={useChipColors()}
        border={useChipBorder(props.selected)}
      >
        <ChipContent {...props} />
      </FilterChip>
    </ControlHost>
  );
}

// The web pill's colours: the selected fill and foreground label when on, the muted label when off.
function useChipColors(): NonNullable<
  React.ComponentProps<typeof FilterChip>['colors']
> {
  return {
    labelColor: String(useCSSVariable('--color-muted-foreground')),
    selectedContainerColor: String(useCSSVariable('--color-selected')),
    selectedLabelColor: String(useCSSVariable('--color-foreground')),
  };
}

// The outline shows only while off; on, it takes the selected fill.
function useChipBorder(
  selected: boolean,
): NonNullable<React.ComponentProps<typeof FilterChip>['border']> {
  const outline = String(useCSSVariable('--color-border'));
  const fill = String(useCSSVariable('--color-selected'));

  return { color: selected ? fill : outline };
}

// TalkBack reads the visible label, so the chip sets no description of its own.
function ChipContent(props: FilterPillProps): React.JSX.Element {
  return (
    <>
      <FilterChip.Label>
        <Text>{filterPillLabel(props)}</Text>
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

export const FilterPill = filterPillFor(PhoneChip);

FilterPill satisfies React.ComponentType<FilterPillProps>;
