import { FilterChip, Text } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { type FilterPillProps, filterPillText } from './filter-pill-props';

// Android: Material's own FilterChip in Argo's colours, with the check mark when on.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <Host matchContents>
      <FilterChip {...chipProps(props, colors)}>
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
  colors: NativeColors,
): Omit<React.ComponentProps<typeof FilterChip>, 'children'> {
  return {
    selected: props.value,
    enabled: !props.disabled,
    colors: chipColors(colors),
    onClick: () => props.onValueChange(!props.value),
    modifiers: [
      semantics({ contentDescription: filterPillText(props).join(', ') }),
    ],
  };
}

// Selected sits on the muted fill with foreground text and check, instead of Material's dynamic container.
function chipColors(
  colors: NativeColors,
): React.ComponentProps<typeof FilterChip>['colors'] {
  return {
    selectedContainerColor: colors.muted,
    selectedLabelColor: colors.foreground,
    selectedLeadingIconColor: colors.foreground,
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
