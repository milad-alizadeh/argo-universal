import type * as React from 'react';
import { View } from 'react-native';
import { type AgentsFilter } from '#features/agents';
import { FilterPill } from '#primitives/buttons/filter-pill';

export interface AgentsFilterProps {
  filter: AgentsFilter;
  onFilter: (filter: AgentsFilter) => void;
}

export interface AgentsSearchProps {
  search: string;
  onSearch: (search: string) => void;
}

export type AgentsHeaderProps = AgentsSearchProps;

export const agentsTitle = 'Agents';

export const searchLabel = 'Search Agents';

export const agentsFilterChoices = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed' },
  { value: 'not-installed', label: 'Not Installed' },
] as const;

export function AgentsFilterPills(props: AgentsFilterProps): React.JSX.Element {
  return (
    <View className="min-h-10 flex-row items-center gap-1">
      {agentsFilterChoices.map(({ value, label }) => (
        <FilterPill
          key={value}
          label={label}
          selected={props.filter === value}
          onPress={() => props.onFilter(value)}
        />
      ))}
    </View>
  );
}
