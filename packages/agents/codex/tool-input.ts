import type { CommandAction, DiffChange, WebAction } from '@repo/contracts';
import type {
  FileUpdateChange,
  CommandAction as VendorCommandAction,
  WebSearchItem,
} from './protocol.gen';
const actionPath = (
  action: VendorCommandAction,
): Pick<CommandAction, 'path'> =>
  'path' in action && action.path !== null ? { path: action.path } : {};
const actionQuery = (
  action: VendorCommandAction,
): Pick<CommandAction, 'query'> =>
  'query' in action && action.query !== null ? { query: action.query } : {};
export const actionOf = (action: VendorCommandAction): CommandAction => ({
  type: action.type === 'listFiles' ? 'list' : action.type,
  command: action.command,
  ...actionPath(action),
  ...actionQuery(action),
});
const modifiedFile = (change: FileUpdateChange): DiffChange =>
  change.kind.type === 'update' && change.kind.move_path
    ? { operation: 'move', path: change.kind.move_path, oldPath: change.path }
    : { operation: 'modify', path: change.path };
export const changeOf = (change: FileUpdateChange): DiffChange => {
  switch (change.kind.type) {
    case 'add':
      return { operation: 'add', path: change.path, newText: change.diff };
    case 'delete':
      return { operation: 'delete', path: change.path, oldText: change.diff };
    default:
      return modifiedFile(change);
  }
};
const searched = (query: string): { title: string; webAction: WebAction } => ({
  title: `Search the web for ${query}`,
  webAction: { type: 'search', query },
});
const fetched = (
  url: string | null,
  title: string,
): { title: string; webAction: WebAction } => ({
  title,
  webAction: url === null ? { type: 'fetch' } : { type: 'fetch', url },
});
// The title and web action Codex's own search action supplies, or its query.
export const webSearchOf = (
  item: WebSearchItem,
): { title: string; webAction: WebAction } => {
  const action = item.action;
  switch (action?.type) {
    case 'search':
      return searched(action.query ?? item.query);
    case 'openPage':
      return fetched(action.url, `Fetch ${action.url ?? 'page'}`);
    case 'findInPage':
      return fetched(
        action.url,
        `Find ${action.pattern ?? 'text'} in ${action.url ?? 'page'}`,
      );
    default:
      return searched(item.query);
  }
};
