import type { ConnectionState } from '#features/connection';
import type { SettingsListViewProps } from './settings-list/settings-list-props';

// The Connection's state as the list shows it: the Server's pages are ready only while it is open.
export function connectionStatus(
  connection: ConnectionState,
): NonNullable<SettingsListViewProps['status']> {
  if (connection === 'open') return 'ready';

  return connection === 'connecting' ? 'loading' : 'disconnected';
}
