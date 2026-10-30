import {
  coreNavigationSections,
  type NavigationSection,
  pluginSectionId,
} from '../../../lib/product/navigation/sections';

// The Rail and drawer as the App lists them: the core sections, then two Plugin nav items in manifest order.
export const pluginNavigationItems: readonly NavigationSection[] = [
  ...coreNavigationSections,
  {
    id: 'plugins/issue-tracker/issues',
    title: 'Issues',
    icon: { sf: 'ticket', material: 'confirmation_number' },
  },
  {
    id: 'plugins/example/example',
    title: 'Example',
    icon: { sf: 'powerplug', material: 'power' },
  },
];

const morePluginNames = [
  'atlas',
  'triage',
  'tours',
  'terminal',
  'activity',
  'guide',
  'diagram',
  'domains',
  'maps',
  'trace',
  'goal',
  'milestone',
  'server',
] as const;

// A Project whose Plugins add more nav items than a short window holds, so the rail's sections scroll.
export const manyPluginNavigationItems: readonly NavigationSection[] = [
  ...pluginNavigationItems,
  ...morePluginNames.map((icon) => ({
    id: pluginSectionId(icon, icon),
    title: icon,
    icon,
  })),
];
