import type * as React from 'react';
import { useConnectionState } from '#features/connection';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import { SettingsList } from '../components/settings-list';

export interface SettingsNavigationListProps {
  selectedDestination?: NavigationDestination;
}

export function SettingsNavigationList({
  selectedDestination,
}: SettingsNavigationListProps): React.JSX.Element {
  const navigate = useNavigate();
  const connection = useConnectionState();
  return (
    <SettingsList
      projects={[]}
      agents={[]}
      selectedDestination={selectedDestination}
      onSelect={navigate}
      status={connectionStatus(connection)}
    />
  );
}

function connectionStatus(
  connection: ReturnType<typeof useConnectionState>,
): React.ComponentProps<typeof SettingsList>['status'] {
  if (connection === 'open') return 'ready';
  return connection === 'connecting' ? 'loading' : 'disconnected';
}
