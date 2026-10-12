import type * as React from 'react';
import { View } from 'react-native';
import {
  FilterPill,
  type FilterPillProps,
} from '#lib/generic/primitives/buttons/filter-pill/filter-pill';
import { IconButton } from '#lib/generic/primitives/buttons/icon-button/icon-button';
import type { AgentCounts, AgentsFilter } from '../state/agent-status';

export interface AgentsFilterProps {
  filter: AgentsFilter;
  counts: AgentCounts;
  onFilter: (filter: AgentsFilter) => void;
}
export interface AgentsSearchProps {
  search: string;
  onSearch: (search: string) => void;
}

export const searchLabel = 'Search Agents';
export const addCustomAgentLabel = 'Add custom Agent';
export const agentsFilterChoices = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed' },
  { value: 'not-installed', label: 'Not installed' },
] as const satisfies readonly { value: AgentsFilter; label: string }[];

// A wide window's Add custom Agent, right of the Agents title and before Search.
export function AddAgentButton(props: {
  onPress: () => void;
}): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      size="sm"
      iconRole="action"
      iconClassName="text-muted-foreground"
      icon="add"
      accessibilityLabel={addCustomAgentLabel}
      onPress={props.onPress}
    />
  );
}

type PillChoice = Omit<FilterPillProps, 'selected' | 'onPress'> & {
  value: AgentsFilter;
};

const pillCounts = (counts: AgentCounts): Partial<PillChoice>[] => [
  {},
  { count: counts.installed },
  { count: counts.notInstalled },
];

const pillChoices = (counts: AgentCounts): PillChoice[] =>
  agentsFilterChoices.map((choice, index) => ({
    ...choice,
    ...pillCounts(counts)[index],
  }));

// A wide window's filters under the Agents title.
export function AgentsFilterPills(props: AgentsFilterProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1">
      {pillChoices(props.counts).map(({ value, ...pill }) => (
        <FilterPill
          key={value}
          {...pill}
          selected={props.filter === value}
          onPress={() => props.onFilter(value)}
        />
      ))}
    </View>
  );
}
