import { SettingsList } from '#components/SettingsList';
import { type NavigationDestination, useNavigate } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { AccountsScreen } from './PlaceholderScreens';

// The `/settings` section root: its list on a phone, and Accounts beside the sidebar list on a wide window.
export function SettingsScreen() {
  return useWide() ? <AccountsScreen /> : <SettingsNavigationList />;
}

export interface SettingsNavigationListProps {
  selectedDestination?: NavigationDestination;
}

// Projects and Agents arrive with the Settings wire-up; until then their groups say so.
export function SettingsNavigationList({
  selectedDestination,
}: SettingsNavigationListProps) {
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
