export type { DesktopBridge } from '@repo/contracts';

export { useConnection } from '#features/connection';

export {
  Frame,
  FramePage,
  type FrameParts,
  FrameSidebar,
  frameSidebarWidth,
  PhoneConnectionBanner,
  SectionDrawer,
  SectionListDetail,
  type SectionList,
  type SectionLists,
  useFrame,
  useNeedsAttention,
  usePhoneDrawerWidth,
  useSectionList,
} from '#features/frame';

export { useSectionLists } from './screens/section-lists';

export {
  OnboardingLayout,
  useOnboardingShown,
} from './screens/onboarding/onboarding-layout';

export { SessionDetailScreen } from './screens/sessions/$id/session-detail-screen';

export { AccountListScreen } from './screens/settings/accounts/account-list-screen';

export { AccountDetailScreen } from './screens/settings/accounts/$id/account-detail-screen';

export { AgentListScreen } from './screens/settings/agents/agent-list-screen';

export { useRestoredThemeChoice } from '#features/settings';

export { ConnectionDetailScreen } from './screens/settings/connection/connection-detail-screen';

export { DeviceListScreen } from './screens/settings/devices/device-list-screen';

export { NotificationsDetailScreen } from './screens/settings/notifications/notifications-detail-screen';

export { PluginListScreen } from './screens/settings/plugins/plugin-list-screen';

export { SlotDetailScreen } from './screens/settings/plugins/slots/$id/slot-detail-screen';

export { PluginSettingsDetailScreen } from './screens/settings/plugins/$id/plugin-settings-detail-screen';

export { ProjectListScreen } from './screens/settings/projects/project-list-screen';

export { ProjectDetailScreen } from './screens/settings/projects/$name/project-detail-screen';

export { ServerListScreen } from './screens/settings/servers/server-list-screen';

export { hasLiquidGlass } from '@repo/kit/native-header';

export {
  type RenderSymbolImage,
  SymbolImagesProvider,
} from '@repo/kit/symbols/symbol-images';

export { iconSymbols } from '@repo/kit/symbols/icon-names';

export type { SizeClass } from '@repo/kit/use-size-class/size-class';

export { EmptyState } from '@repo/kit/primitives/status/empty-state';

export type { EmptyStateProps } from '@repo/kit/primitives/status/empty-state';

export { Text } from '@repo/kit/primitives/content/text';

export { Toaster } from '@repo/kit/primitives/overlays/toast';

export {
  type FirstPage,
  NavigationProvider,
} from '#lib/product/navigation/navigation';

export {
  type Section,
  sectionOf,
  sectionOrder,
  sections,
} from './lib/product/navigation/sections';

export { withoutNewSession } from './lib/product/navigation/new-session';

export { AppProviders } from './app-providers';

export { PortalProvider } from '@repo/kit/primitives/overlays/portal';

export { useNotifications } from './features/notifications';

export { PluginDetailScreen } from './screens/plugins/$path/plugin-detail-screen';

export { ScreenBesideList } from '@repo/kit/primitives/scaffolds/screen';

export {
  TableRowDetailHost,
  type OpenRowDetail,
} from '@repo/kit/primitives/lists/table';

export { PluginErrorToasts } from './screens/plugins/plugin-error-toasts';

export { usePluginListChanges } from './screens/plugins/use-plugin-list-changes';

export {
  pluginAt,
  pluginPath,
  usePluginAt,
  usePluginSections,
  type PluginSection,
} from './screens/plugins/use-plugin-sections';

export {
  coreNavigationSections,
  isCoreSection,
  isPluginSection,
  type CoreSection,
  type NavigationSection,
} from './lib/product/navigation/sections';

export { AgentAccessDetailScreen } from './screens/settings/agent-access/agent-access-detail-screen';
