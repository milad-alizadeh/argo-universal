import type * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text/text';
import { NavigationItem } from '#primitives/lists/navigation-item/navigation-item';
import { sectionAttentionCount } from '../../state/attention-badge';
import { drawerAttentionBadge } from '../attention-badge/attention-badge';
import { type Section, sectionOrder, shellSections } from '../shell-sections';
import { headerBarHeight } from './header-bar-height';
import { PhoneDrawerBackdrop } from './phone-drawer-backdrop';
import type { PhoneShellProps } from './phone-shell';

// The content's edge shades the drawer under it, as if the content lay on top.
const contentEdgeShadow =
  'shadow-[inset_-12px_0_16px_-8px_#0000001a] dark:shadow-[inset_-12px_0_16px_-8px_#00000066]';

type DrawerNavigation = Pick<
  PhoneShellProps,
  | 'selectedSection'
  | 'attentionCount'
  | 'onDrawerOpenChange'
  | 'onSectionChange'
>;

interface PhoneDrawerContentProps extends DrawerNavigation {
  drawerOpen: boolean;
  width: number;
}

function selectSection(navigation: DrawerNavigation, section: Section): void {
  navigation.onSectionChange(section);
  navigation.onDrawerOpenChange(false);
}

function SectionButton({
  section,
  ...navigation
}: DrawerNavigation & { section: Section }): React.JSX.Element {
  const count = sectionAttentionCount(section, navigation.attentionCount);

  return (
    <NavigationItem
      {...shellSections[section]}
      selected={navigation.selectedSection === section}
      badge={drawerAttentionBadge(count)}
      onPress={() => selectSection(navigation, section)}
    />
  );
}

// The header bar's own height, so the title sits level with ☰ and the page's title; on Android the first row then sits level with the docked search.
function DrawerTitle(): React.JSX.Element {
  return (
    <View className="justify-center px-3" style={{ height: headerBarHeight }}>
      <Text role="heading" semanticRole="heading" aria-level={2}>
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
    <View
      className={cn('flex-1 bg-glass px-5 pb-8', contentEdgeShadow)}
      style={{ paddingTop: top }}
    >
      <DrawerTitle />
      <SectionButtons {...navigation} />
    </View>
  );
}

export function PhoneDrawerContent(
  props: PhoneDrawerContentProps,
): React.JSX.Element {
  return (
    <View
      className="flex-1"
      aria-hidden={!props.drawerOpen}
      accessibilityElementsHidden={!props.drawerOpen}
    >
      <PhoneDrawerBackdrop width={props.width} />
      <DrawerGlass {...props} />
    </View>
  );
}
