import type { PluginProps } from '@argo/plugin-kit';
import { pathSegment } from './issue-paths';

type IconName = NonNullable<PluginProps['Icon']['name']>;

/*
 * A navigational entry on the Issues page: its own list of Issues, named by a GitHub search. Built-in
 * filters count their Issues; a label lists its open Issues. Another kind of filter, such as a saved
 * search, is one more group of these.
 */
export type IssueFilter = {
  id: string;
  title: string;
  search: string;
  icon: IconName;
  counted: boolean;
};

export type FilterGroup = { title: string; filters: IssueFilter[] };

const filter = (
  fields: Omit<IssueFilter, 'counted'> & { counted?: boolean },
): IssueFilter => ({ counted: true, ...fields });

const statusGroup: FilterGroup = {
  title: 'Status',
  filters: [
    filter({
      id: 'open',
      title: 'Open',
      search: 'is:open',
      icon: 'issue',
    }),
    filter({
      id: 'closed',
      title: 'Closed',
      search: 'is:closed',
      icon: { sf: 'checkmark.circle', material: 'check_circle' },
    }),
  ],
};

const yoursGroup: FilterGroup = {
  title: 'Yours',
  filters: [
    filter({
      id: 'assigned',
      title: 'Assigned to you',
      search: 'is:open assignee:@me',
      icon: { sf: 'person', material: 'person' },
    }),
    filter({
      id: 'created',
      title: 'Created by you',
      search: 'is:open author:@me',
      icon: { sf: 'square.and.pencil', material: 'edit_square' },
    }),
    filter({
      id: 'mentioned',
      title: 'Mentioning you',
      search: 'is:open mentions:@me',
      icon: { sf: 'at', material: 'alternate_email' },
    }),
  ],
};

export const builtInGroups: readonly FilterGroup[] = [statusGroup, yoursGroup];

// A quoted label name keeps its spaces; GitHub label names never hold a quote worth keeping.
export const labelFilter = (name: string): IssueFilter =>
  filter({
    id: `label-${pathSegment(name)}`,
    title: name,
    search: `is:open label:"${name.replaceAll('"', '')}"`,
    icon: { sf: 'tag', material: 'label' },
    counted: false,
  });

export function filterGroups(labels: readonly string[]): FilterGroup[] {
  if (labels.length === 0) return [...builtInGroups];

  return [
    ...builtInGroups,
    { title: 'Labels', filters: labels.map(labelFilter) },
  ];
}

export const builtInFilters = (): IssueFilter[] =>
  builtInGroups.flatMap((group) => group.filters);
