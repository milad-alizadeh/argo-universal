import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { DesktopShell } from '../src/components/desktop-shell';
import { PhoneMenuButton } from '../src/components/phone-menu-button';
import { PhoneShell, type ShellSection } from '../src/components/phone-shell';
import { SettingsList } from '../src/components/settings-list';
import { shellSections } from '../src/components/shell-sections';
import {
  type NavigationDestination,
  useNavigate,
} from '../src/navigation/context';
import { ScreenHeader } from '../src/navigation/screen-header';
import { useWide } from '../src/navigation/use-wide';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
  ProjectSettingsScreen,
} from '../src/screens/placeholder-screens';

const accountsSectionId = 'settings-accounts';
const projectSectionId = 'settings-project';

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
  >(() => {
    let initialDestination: NavigationDestination | undefined;
    if (page === 'accounts') {
      initialDestination = { to: accountsSectionId };
    } else if (page === 'project') {
      initialDestination = {
        to: projectSectionId,
        name: 'example-project',
      };
    } else {
      initialDestination = undefined;
    }
    return initialDestination;
  });
  const section = page === 'issues' || page === 'atlas' ? page : 'settings';
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const selectedDestination: NavigationDestination | undefined =
    destination ?? (wide ? { to: accountsSectionId } : undefined);
  const list = (
    <SettingsList
      {...settingsListMocks}
      selectedDestination={selectedDestination}
      onSelect={(next) => {
        navigate(next);
        setDestination(next);
      }}
    />
  );
  let detail: ReactNode;
  if (page === 'issues') {
    detail = <IssuesScreen />;
  } else if (page === 'atlas') {
    detail = <AtlasScreen />;
  } else if (selectedDestination?.to === 'settings-projects') {
    detail = (
      <View className="gap-2 p-4">
        <Text role="heading">Projects</Text>
        {settingsListMocks.projects.map(({ name }) => (
          <Button
            key={name}
            variant="ghost"
            accessibilityLabel={name}
            onPress={() => {
              const next: NavigationDestination = {
                to: projectSectionId,
                name,
              };
              navigate(next);
              setDestination(next);
            }}
          >
            <Text>{name}</Text>
          </Button>
        ))}
      </View>
    );
  } else if (selectedDestination?.to === 'settings-agents') {
    detail = (
      <View className="gap-2 p-4">
        <Text role="heading">Agents</Text>
        {settingsListMocks.agents.map(({ agent, label }) => (
          <Button
            key={agent}
            variant="ghost"
            accessibilityLabel={label}
            onPress={() => {
              const next: NavigationDestination = {
                to: 'settings-agent',
                agent,
              };
              navigate(next);
              setDestination(next);
            }}
          >
            <Text>{label}</Text>
          </Button>
        ))}
      </View>
    );
  } else if (selectedDestination?.to === projectSectionId) {
    detail = <ProjectSettingsScreen name={selectedDestination.name} />;
  } else if (selectedDestination?.to === 'settings-agent') {
    detail = (
      <Text className="p-6">
        Settings for {selectedDestination.agent} will appear here.
      </Text>
    );
  } else if (
    selectedDestination &&
    selectedDestination.to !== accountsSectionId
  ) {
    let placeholderTitle = 'Notifications';
    if (selectedDestination.to === 'settings-connection')
      placeholderTitle = 'Connection';
    else if (selectedDestination.to === 'settings-devices')
      placeholderTitle = 'Devices';
    else if (selectedDestination.to === 'settings-appearance')
      placeholderTitle = 'Appearance';
    detail = <Text className="p-6">{placeholderTitle} will appear here.</Text>;
  } else {
    detail = <AccountsScreen />;
  }

  function selectSection(next: ShellSection) {
    navigate(next === 'settings' ? { to: accountsSectionId } : { to: next });
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
    >
      <ScreenHeader
        title={shellSections[section].title}
        left={<PhoneMenuButton />}
      />
      {section === 'settings' ? list : detail}
    </PhoneShell>
  );
}
