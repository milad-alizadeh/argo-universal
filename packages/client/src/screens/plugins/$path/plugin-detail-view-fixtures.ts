import { WireNode } from '@repo/contracts/plugins/wire';
import { Platform } from 'react-native';
import trees from './plugin-detail-view-issue-filters.json' with { type: 'json' };
import jiraTrees from './plugin-detail-view-jira-issue.json' with { type: 'json' };

// Recorded from the Issues Loader through its public page boundary, for each platform drawing.
const drawing =
  Platform.OS === 'ios' || Platform.OS === 'android' ? 'native' : 'desktop';

export const issueFilters = { root: WireNode.parse(trees.loaded[drawing]) };

export const issueFiltersUnavailable = {
  root: WireNode.parse(trees.unavailable[drawing]),
};

// Recorded from the Jira Plugin's issue page through its public page boundary: the issue, a status move Jira has not answered yet, and an issue Jira cannot find. Every platform draws the same tree.
export const jiraIssue = { root: WireNode.parse(jiraTrees.issue) };

export const jiraIssueMoving = { root: WireNode.parse(jiraTrees.pending) };

export const jiraIssueUnreadable = {
  root: WireNode.parse(jiraTrees.unreadable),
};
