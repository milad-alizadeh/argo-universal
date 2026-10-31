import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import type { BadgeCount } from '@repo/kit/badge-count';
import { Text } from '@repo/kit/primitives/content/text';
import {
  DrawerItem,
  type DrawerItemProps,
} from '@repo/kit/primitives/lists/drawer-item';
import type * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type Section,
  type NavigationSection,
} from '../../../../lib/product/navigation/sections';
import { sectionBadge } from '../../utils/section-badge';
import { DrawerFocusScope } from './drawer-focus-scope';

interface DrawerNavigation {
  items: readonly NavigationSection[];
  selectedSection: Section;
  // The Sessions that need input or are Unread, for the Sessions row's badge.
  attentionCount: number;
  // Each Plugin nav item's own count, for its row's badge.
  pluginBadges?: readonly PluginBadge[];
  // A row was picked; the drawer closes, and a new section shows.
  onSectionChange: (section: Section) => void;
}

export interface PhoneDrawerContentProps extends DrawerNavigation {
  open: boolean;
  scrimLabel: string;
}

function sectionItem(
  section: NavigationSection,
): Pick<DrawerItemProps, 'label' | 'icon'> {
  const { title, icon } = section;

  return { label: title, icon };
}

const rowBadge = (
  section: NavigationSection,
  navigation: DrawerNavigation,
): BadgeCount =>
  sectionBadge(
    section.id,
    navigation.attentionCount,
    navigation.pluginBadges ?? [],
  );

function SectionButton({
  section,
  ...navigation
}: DrawerNavigation & { section: NavigationSection }): React.JSX.Element {
  return (
    <DrawerItem
      {...sectionItem(section)}
      selected={navigation.selectedSection === section.id}
      badge={rowBadge(section, navigation)}
      onPress={() => navigation.onSectionChange(section.id)}
    />
  );
}

// The drawer slides in over the page's header, so its title keeps its own spacing.
function DrawerTitle(): React.JSX.Element {
  return (
    <View className="justify-center px-3 py-3">
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        Argo
      </Text>
    </View>
  );
}

function SectionButtons(navigation: DrawerNavigation): React.JSX.Element {
  return (
    <View className="flex-1 gap-1">
      {navigation.items.map((section) => (
        <SectionButton key={section.id} section={section} {...navigation} />
      ))}
    </View>
  );
}

// Plain translucent glass: over the plain window surface a blur would cost a filter pass and show nothing.
function DrawerGlass(navigation: DrawerNavigation): React.JSX.Element {
  const { top } = useSafeAreaInsets();

  return (
    <View
      testID="phone-drawer"
      className="flex-1 bg-glass px-5 pb-8"
      style={{ paddingTop: top }}
    >
      <DrawerTitle />
      <SectionButtons {...navigation} />
    </View>
  );
}

// The phone's drawer of sections: the title, then a row per section, on the window surface.
export function PhoneDrawerContent({
  open,
  scrimLabel,
  ...glass
}: PhoneDrawerContentProps): React.JSX.Element {
  return (
    <DrawerFocusScope open={open} scrimLabel={scrimLabel}>
      <DrawerGlass {...glass} />
    </DrawerFocusScope>
  );
}
