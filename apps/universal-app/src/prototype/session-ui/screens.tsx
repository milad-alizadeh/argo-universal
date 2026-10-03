// PROTOTYPE: route screens. On a phone each drawer section opens on its list; wide windows draw the list in the desktop sidebar.
import { Redirect, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ChevronLeft, Menu } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATLAS_RESOURCES, AtlasList, AtlasResource } from './atlas';
import { getView, IssueScreen, IssueViewList, IssueViewPane, IssueViews, NewIssue, viewCaption } from './issues';
import { SessionScreen } from './session-screen';
import { SessionList } from './session-list';
import { AccountsScreen, ProjectSettings, SettingsScreen } from './settings';
import { firstSessionId, ListScreen, NewSession } from './shell';
import { getState, useStore } from './store';
import { go, Press, useBase, useColors, useWide } from './ui';

const back = (base: string) => () => (router.canGoBack() ? router.back() : go(base, true));

function DrawerButton() {
  const navigation = useNavigation() as unknown as { openDrawer?: () => void };
  const colors = useColors();
  return (
    <Press onPress={() => navigation.openDrawer?.()} className="-ml-1.5 rounded-lg p-1.5" hoverClassName="">
      <Menu size={22} color={colors.foreground} />
    </Press>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Press onPress={onPress} className="mb-1 -ml-2 rounded-lg py-1.5" hoverClassName="">
      <ChevronLeft size={26} color={colors.foreground} />
    </Press>
  );
}

// A drawer section's screen: the desktop sidebar's list, full screen.
function PhoneRoot({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {children}
    </View>
  );
}

export function SessionsRoute() {
  const base = useBase();
  if (useWide()) return <Redirect href={`${base}/session/${firstSessionId()}` as never} />;
  return (
    <PhoneRoot>
      <SessionList style="phone" leading={<DrawerButton />} onOpen={(id) => go(`${base}/session/${id}`)} onNew={() => go(`${base}/new`)} />
    </PhoneRoot>
  );
}

export function IssuesRoute() {
  const base = useBase();
  if (useWide()) return <IssueViewPane viewId="all" onOpen={(id) => go(`${base}/issue/${id}`)} />;
  return (
    <PhoneRoot>
      <IssueViews style="phone" leading={<DrawerButton />} />
    </PhoneRoot>
  );
}

export function IssueViewRoute() {
  const base = useBase();
  const { view: id } = useLocalSearchParams<{ view: string }>();
  useStore((s) => s.projects);
  const view = getView(decodeURIComponent(id));
  if (useWide()) return <IssueViewPane viewId={view.id} onOpen={(next) => go(`${base}/issue/${next}`)} />;
  return (
    <ListScreen title={view.name} caption={viewCaption(view)} left={<BackButton onPress={back(base)} />}>
      <IssueViewList view={view} style="phone" onOpen={(next) => go(`${base}/issue/${next}`)} />
    </ListScreen>
  );
}

export function NewIssueRoute() {
  const base = useBase();
  const { project } = useLocalSearchParams<{ project?: string }>();
  return <NewIssue initial={project} onBack={back(base)} onCreated={(id) => go(`${base}/issue/${id}`, true)} />;
}

export function AtlasRoute() {
  const base = useBase();
  if (useWide()) return <Redirect href={`${base}/resource/${getState().projects[0]!.name}/${ATLAS_RESOURCES[0]!.id}` as never} />;
  return (
    <PhoneRoot>
      <AtlasList style="phone" leading={<DrawerButton />} />
    </PhoneRoot>
  );
}

export function AtlasResourceRoute() {
  const base = useBase();
  const { project, id } = useLocalSearchParams<{ project: string; id: string }>();
  return <AtlasResource project={project} id={id} onBack={back(base)} />;
}

export function SettingsRoute() {
  const base = useBase();
  if (useWide()) return <AccountsScreen onBack={back(base)} />;
  return <SettingsScreen leading={<DrawerButton />} />;
}

export function ProjectSettingsRoute() {
  const base = useBase();
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ProjectSettings name={name} onBack={back(base)} />;
}

export function AccountsRoute() {
  const base = useBase();
  return <AccountsScreen onBack={back(base)} />;
}

export function SessionRoute() {
  const base = useBase();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionScreen id={id} onBack={back(base)} />;
}

export function IssueRoute() {
  const base = useBase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const wide = useWide();
  return <IssueScreen id={id} onBack={wide ? () => go(`${base}/issues`) : back(base)} onOpenSession={(next) => go(`${base}/session/${next}`)} />;
}

export function NewRoute() {
  const base = useBase();
  return <NewSession onBack={back(base)} onCreated={(id) => go(`${base}/session/${id}`, true)} />;
}
