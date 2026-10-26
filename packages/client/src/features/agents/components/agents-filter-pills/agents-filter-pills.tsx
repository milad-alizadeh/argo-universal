import { FilterPill } from '@repo/kit/primitives/controls/filter-pill';
import { useListGutter } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import type { AgentsFilter } from '../../utils/agents-filter';

export interface AgentsFilterProps {
  filter: AgentsFilter;
  onFilter: (filter: AgentsFilter) => void;
}

const agentsFilterChoices = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed' },
  { value: 'not-installed', label: 'Not Installed' },
] as const;

function AgentsFilterChoices(props: AgentsFilterProps): React.JSX.Element[] {
  return agentsFilterChoices.map(({ value, label }) => (
    <FilterPill
      key={value}
      label={label}
      selected={props.filter === value}
      onPress={() => props.onFilter(value)}
    />
  ));
}

// One row that heads the Agents catalog; it scrolls sideways, fading the edge the pills pass under, when they run past a narrow screen's edge.
export function AgentsFilterPills(props: AgentsFilterProps): React.JSX.Element {
  const gutter = useListGutter();

  return (
    <View className="pb-3">
      <ScrollFadeView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-1"
        contentContainerStyle={{ paddingHorizontal: gutter }}
      >
        <AgentsFilterChoices {...props} />
      </ScrollFadeView>
    </View>
  );
}
