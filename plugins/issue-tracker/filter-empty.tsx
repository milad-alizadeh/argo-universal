import { Button, EmptyState, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  noIssuesBecause,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { projectTrackerPath } from './issue-paths';

/*
 * What an empty list says: why there are no Issues. Where the Tracker did not open, Project details is where it
 * is set up, so the state offers the way to it.
 */
export const noIssues = (
  data: FilterData,
  to: PageTo<FilterState>,
): JSX.Element => (
  <EmptyState
    title={noIssuesBecause(data) || 'No Issues.'}
    action={data.state === 'unopened' ? actions(data, to) : undefined}
  />
);

type Unopened = Extract<FilterData, { state: 'unopened' }>;

// The Tracker is chosen on the Project's own page; the page it opens leaves the Project's list ready.
const actions = (
  { project }: Unopened,
  to: PageTo<FilterState>,
): JSX.Element => (
  <Button
    label="Choose a tracker"
    onPress={to.go(projectTrackerPath(project.id))}
  />
);
