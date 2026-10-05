export {
  DesktopShell,
  type DesktopShellProps,
  type InspectorState,
} from './components/DesktopShell';
export { Icon, type IconProps } from './components/Icon';
export {
  PhoneListHeader,
  type PhoneListHeaderProps,
} from './components/PhoneListHeader';
export {
  PhoneShell,
  type PhoneShellProps,
  type ShellSection,
} from './components/PhoneShell';
export { SessionRow, type SessionRowProps } from './components/SessionRow';
export {
  SettingsList,
  type SettingsListProps,
} from './components/SettingsList';
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
export { useWide } from './navigation/use-wide';
export {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
  ProjectSettingsScreen,
  type ProjectSettingsScreenProps,
} from './screens/PlaceholderScreens';
export { ProjectsScreen } from './screens/ProjectsScreen';
export {
  SessionScreen,
  type SessionScreenProps,
} from './screens/SessionScreen';
export { AppProviders, type AppProvidersProps } from './trpc/app-providers';
export { TRPCProvider, useTRPC, useTRPCClient } from './trpc/context';
export { createTRPCClient, type TRPCClient } from './trpc/create-trpc-client';
