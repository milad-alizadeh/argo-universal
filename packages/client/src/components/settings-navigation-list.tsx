import type * as React from 'react';
import { type NavigationDestination, useNavigate } from '../navigation/context';
import { SettingsList } from './settings-list';

export interface SettingsNavigationListProps {
  selectedDestination?: NavigationDestination;
}

// Projects and Agents arrive with the Settings wire-up; until then their groups say so.
export function SettingsNavigationList({
  selectedDestination,
}: SettingsNavigationListProps): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <SettingsList
      projects={[]}
      agents={[]}
      selectedDestination={selectedDestination}
      onSelect={navigate}
    />
  );
}
