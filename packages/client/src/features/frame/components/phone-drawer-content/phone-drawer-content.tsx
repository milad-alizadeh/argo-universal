import type * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '#primitives/display/text';
import {
  DrawerItem,
  type DrawerItemProps,
} from '#primitives/lists/drawer-item';
import { sectionAttentionCount } from '../../state/attention-badge';
import { drawerAttentionBadge } from '../attention-badge/attention-badge';
import { type Section, sectionOrder, shellSections } from '../shell-sections';
import { PhoneDrawerBackdrop } from './phone-drawer-backdrop';

interface DrawerNavigation {
  selectedSection: Section;
  // The Sessions that need input or are Unread, for the Sessions row's badge.
  attentionCount: number;
  // A row was picked; the drawer closes, and a new section shows.
  onSectionChange: (section: Section) => void;
}

export interface PhoneDrawerContentProps extends DrawerNavigation {
  open: boolean;
  width: number;
}

function sectionItem(
  section: Section,
): Pick<DrawerItemProps, 'label' | 'icon'> {
  const { title, icon } = shellSections[section];

  return { label: title, icon };
}

function SectionButton({
  section,
  ...navigation
}: DrawerNavigation & { section: Section }): React.JSX.Element {
  const count = sectionAttentionCount(section, navigation.attentionCount);

  return (
    <DrawerItem
      {...sectionItem(section)}
      selected={navigation.selectedSection === section}
      badge={drawerAttentionBadge(count)}
      onPress={() => navigation.onSectionChange(section)}
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
      {sectionOrder.map((section) => (
        <SectionButton key={section} section={section} {...navigation} />
      ))}
    </View>
  );
}

// Plain translucent glass: over a still, soft glow a blur would cost a filter pass and show nothing.
function DrawerGlass(navigation: DrawerNavigation): React.JSX.Element {
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-glass px-5 pb-8" style={{ paddingTop: top }}>
      <DrawerTitle />
      <SectionButtons {...navigation} />
    </View>
  );
}

const hiddenWhileClosed = (open: boolean) =>
  ({ 'aria-hidden': !open, accessibilityElementsHidden: !open }) as const;

// The phone's drawer of sections: the title, then a row per section, over a still glow.
export function PhoneDrawerContent({
  open,
  width,
  ...glass
}: PhoneDrawerContentProps): React.JSX.Element {
  return (
    <View className="flex-1" {...hiddenWhileClosed(open)}>
      <PhoneDrawerBackdrop width={width} />
      <DrawerGlass {...glass} />
    </View>
  );
}
