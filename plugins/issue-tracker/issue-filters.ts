import type { PluginProps } from '@argo/plugin-kit';
import { pathSegment, pathText } from './issue-paths';

type IconName = NonNullable<PluginProps['FieldGroup.Link']['leading']>;

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

type FilterGroup = { title: string; filters: IssueFilter[] };

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

const builtInGroups: readonly FilterGroup[] = [statusGroup, yoursGroup];

// A quoted label name keeps its spaces; GitHub label names never hold a quote worth keeping.
export const labelFilter = (name: string): IssueFilter =>
  filter({
    id: `label-${pathSegment(name)}`,
    title: name,
    search: `is:open label:"${name.replaceAll('"', '')}"`,
    icon: { sf: 'tag', material: 'label' },
    counted: false,
  });

export const builtInFilters = (): IssueFilter[] =>
  builtInGroups.flatMap((group) => group.filters);

const labelPrefix = 'label-';

// The filter a path's filter segment names: a built-in one by its id, or a label by its encoded name.
export function filterById(id: string): IssueFilter | undefined {
  if (id.startsWith(labelPrefix))
    return labelFilter(pathText(id.slice(labelPrefix.length)));

  return builtInFilters().find((filter) => filter.id === id);
}
