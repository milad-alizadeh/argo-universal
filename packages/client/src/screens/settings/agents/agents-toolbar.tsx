import type * as React from 'react';
import { type AgentsFilter } from '#features/agents';
import { cn } from '#lib/generic/utils';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { FilterPill } from '#primitives/inputs/filter-pill';

export interface AgentsFilterProps {
  filter: AgentsFilter;
  onFilter: (filter: AgentsFilter) => void;
}

export interface AgentsSearchProps {
  search: string;
  onSearch: (search: string) => void;
}

export const agentsTitle = 'Agents';

export const searchLabel = 'Search Agents';

export const agentsFilterChoices = [
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

interface PillRowProps extends AgentsFilterProps {
  contentClassName?: string;
  className?: string;
}

// One row that scrolls sideways when the pills run past a narrow screen's edge, fading the edge they pass under.
function FilterPillRow(props: PillRowProps): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={props.className}
      contentContainerClassName={cn(
        'items-center gap-1',
        props.contentClassName,
      )}
    >
      <AgentsFilterChoices {...props} />
    </ScrollFadeView>
  );
}

// The row heads the catalog List, inset like its rows, so the pills line up with the cards and scroll with them.
export function AgentsFilterPills(props: AgentsFilterProps): React.JSX.Element {
  return <FilterPillRow {...props} contentClassName="px-4 wide:px-0" />;
}
