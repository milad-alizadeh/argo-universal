import type { CommandAction, DiffChange } from '@repo/contracts';
import type {
  FileUpdateChange,
  CommandAction as VendorCommandAction,
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
