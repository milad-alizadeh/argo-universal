import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
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
        {...useChipLook(props.selected)}
      >
        <ChipContent {...props} />
      </FilterChip>
    </ControlHost>
  );
}

// The outline shows only while off; on, it takes the selected fill.
function useChipLook(
  selected: boolean,
): Pick<React.ComponentProps<typeof FilterChip>, 'colors' | 'border'> {
  const { chipColors, roles } = useMaterialPalette();

  return {
    colors: chipColors,
    border: { color: selected ? roles.primary : roles.outlineVariant },
  };
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
      <NativeSymbol name="check" size="sm" />
    </FilterChip.LeadingIcon>
  );
}

export const FilterPill = filterPillFor(PhoneChip);

FilterPill satisfies React.ComponentType<FilterPillProps>;
