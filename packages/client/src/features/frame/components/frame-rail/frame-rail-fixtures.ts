import { coreNavigationSections } from '../../../../lib/product/navigation/sections';
import { manyPluginNavigationItems } from '../navigation-items.mocks';
import type { FrameRailProps } from './frame-rail';

// A story supplies the callbacks; a fixture is the rail's sections and what is open.
type FrameRailFixture = Omit<
  FrameRailProps,
  'onSectionChange' | 'onSidebarShownChange'
>;

export const expandedRail = {
  items: coreNavigationSections,
  hasSidebar: true,
  selectedSection: 'sessions',
  attentionCount: 1,
  sidebarShown: true,
} satisfies FrameRailFixture;

// The sidebar is hidden, so the tiles keep the collapsed column and the rail drops its edge.
export const collapsedRail = {
  ...expandedRail,
  sidebarShown: false,
} satisfies FrameRailFixture;

// A Project whose Plugins add more sections than a short window holds.
export const manyPluginSectionsRail = {
  ...expandedRail,
  items: manyPluginNavigationItems,
} satisfies FrameRailFixture;
