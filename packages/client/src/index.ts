import type {} from './lib/generic/reusables-compatibility';

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
  type SectionList,
  type SectionLists,
  useFrame,
  SectionMenuButton,
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

export { AgentListScreen } from './screens/settings/agents/agent-list-screen';

export { AgentDetailScreen } from './screens/settings/agents/$agent/agent-detail-screen';

export { CustomAgentNewScreen } from './screens/settings/agents/new/custom-agent-new-screen';

export { AppearanceDetailScreen } from './screens/settings/appearance/appearance-detail-screen';

export { ConnectionDetailScreen } from './screens/settings/connection/connection-detail-screen';

export { DeviceListScreen } from './screens/settings/devices/device-list-screen';

export { NotificationsDetailScreen } from './screens/settings/notifications/notifications-detail-screen';

export { ProjectListScreen } from './screens/settings/projects/project-list-screen';

export { ProjectDetailScreen } from './screens/settings/projects/$name/project-detail-screen';

export { hasLiquidGlass } from '#lib/generic/native-header';

export {
  type RenderSymbolImage,
  SymbolImagesProvider,
} from './lib/generic/symbols/symbol-images';

export { iconSymbols } from './lib/generic/symbols/icon-names';

export { useWide } from './lib/generic/use-wide/use-wide';

export { useSizeClass } from './lib/generic/use-size-class/use-size-class';

export type { SizeClass } from './lib/generic/use-size-class/size-class';

export { Text } from '#primitives/display/text';

export { Toaster } from '#primitives/overlays/toast';

export {
  type FirstPage,
  NavigationProvider,
} from '#lib/product/navigation/navigation';

export {
  nativeHeaderOptions,
  screenHeaderOptions,
} from '#lib/product/navigation/screen-header';

export {
  type Section,
  sectionOf,
  sectionOrder,
} from './lib/product/navigation/sections';

export { withoutNewSession } from './lib/product/navigation/new-session';

export { AppProviders } from './app-providers';

export { PortalHost } from '#primitives/overlays/portal';

export { useDesktopNotifications } from './features/frame/notifications/use-desktop-notifications';

export { PluginDetailScreen } from './screens/plugins/$path/plugin-detail-screen';

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
