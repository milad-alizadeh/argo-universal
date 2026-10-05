import { useState } from 'react';
import { View } from 'react-native';
import { DesktopShell } from '../src/components/DesktopShell';
import { PhoneShell, type ShellSection } from '../src/components/PhoneShell';
import { SettingsList } from '../src/components/SettingsList';
import {
  type NavigationDestination,
  useNavigate,
} from '../src/navigation/context';
import { useWide } from '../src/navigation/use-wide';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
  ProjectSettingsScreen,
} from '../src/screens/PlaceholderScreens';

export const settingsListMocks = {
  projects: [{ name: 'example-project' }],
  agents: [
    { agent: 'first-agent', label: 'First Agent' },
    { agent: 'second-agent', label: 'Second Agent' },
  ],
};

export type PlaceholderPage =
  | 'issues'
  | 'atlas'
  | 'accounts'
  | 'project'
  | 'settings';

export function SettingsListMock({
  page = 'settings',
}: {
  page?: PlaceholderPage;
}) {
  const wide = useWide();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarShown, setSidebarShown] = useState(true);
  const [destination, setDestination] = useState<
    NavigationDestination | undefined
  >(() =>
    page === 'accounts'
      ? { to: 'settings-accounts' }
      : page === 'project'
        ? { to: 'settings-project', name: 'example-project' }
        : undefined,
  );
  const section = page === 'issues' || page === 'atlas' ? page : 'settings';
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const selectedDestination: NavigationDestination | undefined =
    destination ?? (wide ? { to: 'settings-accounts' } : undefined);
  const list = (
    <SettingsList
      {...settingsListMocks}
      selectedDestination={selectedDestination}
      onSelect={(next) => {
        navigate(next);
        if (next.to === 'settings-accounts' || next.to === 'settings-project')
          setDestination(next);
      }}
    />
  );
  const detail =
    page === 'issues' ? (
      <IssuesScreen />
    ) : page === 'atlas' ? (
      <AtlasScreen />
    ) : selectedDestination?.to === 'settings-project' ? (
      <ProjectSettingsScreen name={selectedDestination.name} />
    ) : (
      <AccountsScreen />
    );

  function selectSection(next: ShellSection) {
    navigate(next === 'settings' ? { to: 'settings-accounts' } : { to: next });
  }

  if (wide) {
    return (
      <DesktopShell
        selectedSection={section}
        attentionCount={0}
        sidebarShown={sidebarShown}
        onSidebarShownChange={setSidebarShown}
        onSectionChange={selectSection}
        listHeader={<Text className="text-base font-semibold">{title}</Text>}
        list={
          section === 'settings' ? (
            list
          ) : (
            <Text className="p-6 text-muted-foreground">
              {title} list will appear here.
            </Text>
          )
        }
        detailHeader={<Text className="text-sm font-semibold">{title}</Text>}
        inspectorState="closed"
        onInspectorStateChange={() => {}}
        inspectorHeader={null}
        inspector={null}
      >
        {detail}
      </DesktopShell>
    );
  }
  if (section === 'settings' && destination) {
    return (
      <View className="flex-1 bg-background">
        <Button
          variant="ghost"
          accessibilityLabel="Back to Settings"
          onPress={() => {
            setDestination(undefined);
          }}
        >
          <Text>Back to Settings</Text>
        </Button>
        {detail}
      </View>
    );
  }
  return (
    <PhoneShell
      selectedSection={section}
      attentionCount={0}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      onSectionChange={selectSection}
      onSearch={() => {}}
      onFilter={() => {}}
    >
      {section === 'settings' ? list : detail}
    </PhoneShell>
  );
}
