import type {
  PageAddress,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type { QueryKey } from '@tanstack/react-query';

// Which Loader page, and the Project or Session it opened for; the Page state is the App's to keep.
export type PageOpening = Omit<PageAddress, 'pageState'>;

const treeRoot = 'pluginPageTree';

// One key for an address, as the App draws it and as a stale mark from the Server names it.
export const treeKey = ({
  pluginId,
  path,
  pageState,
  projectId,
  sessionId,
}: PageAddress): QueryKey => [
  treeRoot,
  pluginId,
  path,
  { pageState, projectId, sessionId },
];

// Page state belongs to the page, not to the Project or Session it opened for, so Back and a later visit keep it.
export const stateKey = ({ pluginId, path }: PageOpening): QueryKey => [
  'pluginPageState',
  pluginId,
  path,
];

type TreeFilter = { queryKey: QueryKey; exact?: boolean };

// Each address a stale mark names, exactly, or every address of the Plugin when it names none.
export const staleFilters = ({
  pluginId,
  addresses,
}: StaleMark): TreeFilter[] =>
  addresses
    ? addresses.map((address) => ({ queryKey: treeKey(address), exact: true }))
    : [{ queryKey: pluginKey(pluginId) }];
