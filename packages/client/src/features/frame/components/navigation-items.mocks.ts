import {
  coreNavigationSections,
  type NavigationSection,
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
    id: 'plugins/hello/hello',
    title: 'Hello',
    icon: { sf: 'powerplug', material: 'power' },
  },
];
