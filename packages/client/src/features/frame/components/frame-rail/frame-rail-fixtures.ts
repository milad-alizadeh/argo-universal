import { coreNavigationSections } from '../../../../lib/product/navigation/sections';
import {
  manyPluginNavigationItems,
  pluginNavigationItems,
} from '../navigation-items.mocks';
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

// Paper "Navigation Desktop · Plugin badge counts": a Plugin's nav item counts 12, and another goes over 99.
export const pluginBadgeRail = {
  ...expandedRail,
  items: pluginNavigationItems,
  pluginBadges: [
    { pluginId: 'issue-tracker', id: 'issues', count: 12 },
    { pluginId: 'example', id: 'example', count: 100 },
  ],
} satisfies FrameRailFixture;

// Jira's mark from Simple Icons 13.21.0 (CC0), as the Server sends a Plugin's own icon: canonical markup, one colour, in `currentColor`.
const jiraMarkup =
  '<svg fill="currentColor" view-box="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/></svg>';

// A Plugin that ships its own icon (ADR-0058): the tile draws it in the tint every section takes, selected here.
export const ownPluginIconRail = {
  ...expandedRail,
  items: [
    ...coreNavigationSections,
    { id: 'plugins/jira/issues', title: 'Jira', icon: { markup: jiraMarkup } },
  ],
  selectedSection: 'plugins/jira/issues',
} satisfies FrameRailFixture;
