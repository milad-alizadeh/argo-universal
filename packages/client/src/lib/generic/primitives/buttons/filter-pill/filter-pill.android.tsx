import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { ControlHost } from '#primitives/native/native-control';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { useWide } from '../../../use-wide/use-wide';
import { type FilterPillProps, filterPillText } from './filter-pill-props';
import { FilterPill as WideFilterPill } from './filter-pill.tsx';

// A phone's filter is Material 3's own FilterChip, its container, label and outline set to Argo's tokens through the colors and border props, leading with the check mark while on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  if (useWide()) return <WideFilterPill {...props} />;

  return <PhoneChip {...props} />;
}

function PhoneChip(props: FilterPillProps): React.JSX.Element {
  return (
    <ControlHost matchContents>
      <FilterChip
        selected={props.selected}
        onClick={props.onPress}
        colors={useChipColors()}
        border={useChipBorder(props.selected)}
        modifiers={chipModifiers(props)}
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
