import { pluginNavigationItems } from '../navigation-items.mocks';
import type { PhoneDrawerContentProps } from './phone-drawer-content';

// A story supplies onSectionChange; a fixture is the sections and which one is open.
type PhoneDrawerFixture = Omit<PhoneDrawerContentProps, 'onSectionChange'>;

// Paper's "LiveSessionList (phone) / Drawer open": the core sections, then the Project's Plugin nav items.
export const openPhoneDrawer = {
  items: pluginNavigationItems,
  selectedSection: 'sessions',
  attentionCount: 1,
  pluginBadges: [{ pluginId: 'issue-tracker', id: 'issues', count: 12 }],
  open: true,
  scrimLabel: 'Close navigation',
} satisfies PhoneDrawerFixture;
