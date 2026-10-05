export {
  DesktopLayout,
  type DesktopLayoutProps,
} from './components/DesktopLayout';
export {
  DesktopShell,
  type DesktopShellProps,
  type InspectorState,
} from './components/DesktopShell';
export { Icon, type IconProps } from './components/Icon';
export {
  IssueIndicator,
  type IssueIndicatorProps,
} from './components/IssueIndicator';
export {
  PhoneListHeader,
  type PhoneListHeaderProps,
} from './components/PhoneListHeader';
export {
  PhoneSectionsLayout,
  type PhoneSectionsLayoutProps,
} from './components/PhoneSectionsLayout';
export {
  PhoneShell,
  type PhoneShellProps,
  type ShellSection,
} from './components/PhoneShell';
export {
  PullRequestIndicator,
  type PullRequestIndicatorProps,
} from './components/PullRequestIndicator';
export { SessionRow, type SessionRowProps } from './components/SessionRow';
export {
  SettingsList,
  type SettingsListProps,
} from './components/SettingsList';
export {
  StatusIndicator,
  type StatusIndicatorProps,
} from './components/StatusIndicator';
export {
  type ConnectionState,
  useConnection,
  useConnectionState,
} from './connection/context';
export { applyTheme } from './lib/theme';
export {
  type Navigate,
  type NavigationDestination,
  NavigationProvider,
  type NavigationProviderProps,
  useNavigate,
} from './navigation/context';
export { sectionOf } from './navigation/sections';
export { useWide } from './navigation/use-wide';
export { ConnectionScreen } from './screens/ConnectionScreen';
export {
  AccountsScreen,
  AgentSettingsScreen,
  type AgentSettingsScreenProps,
  AtlasScreen,
  IssuesScreen,
  NewSessionScreen,
  ProjectSettingsScreen,
  type ProjectSettingsScreenProps,
} from './screens/PlaceholderScreens';
export {
  SessionScreen,
  type SessionScreenProps,
} from './screens/SessionScreen';
export { SessionsScreen } from './screens/SessionsScreen';
export { SettingsScreen } from './screens/SettingsScreen';
export { AppProviders, type AppProvidersProps } from './trpc/app-providers';
export { TRPCProvider, useTRPC, useTRPCClient } from './trpc/context';
export { createTRPCClient, type TRPCClient } from './trpc/create-trpc-client';
