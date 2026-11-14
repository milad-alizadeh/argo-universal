import { WireNode } from '@repo/contracts/plugins/wire';
import { Platform } from 'react-native';
import trees from './plugin-detail-view-issue-filters.json' with { type: 'json' };

// Recorded from the Issues Loader through its public page boundary, for each platform drawing.
const drawing =
  Platform.OS === 'ios' || Platform.OS === 'android' ? 'native' : 'desktop';

export const issueFilters = { root: WireNode.parse(trees.loaded[drawing]) };

export const issueFiltersUnavailable = {
  root: WireNode.parse(trees.unavailable[drawing]),
};
