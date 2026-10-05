import { ChatsIcon } from 'phosphor-react-native/src/icons/Chats';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { TicketIcon } from 'phosphor-react-native/src/icons/Ticket';
import { TreeStructureIcon } from 'phosphor-react-native/src/icons/TreeStructure';
import { type ReactNode, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useCSSVariable, useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';
import { PhoneListHeader } from './PhoneListHeader';
import { PhoneShellCard } from './PhoneShellCard';

const sections = {
  sessions: { title: 'Sessions', icon: ChatsIcon },
  issues: { title: 'Issues', icon: TicketIcon },
  atlas: { title: 'Atlas', icon: TreeStructureIcon },
  settings: { title: 'Settings', icon: GearSixIcon },
} as const;

export type ShellSection = keyof typeof sections;

export interface PhoneShellProps {
  selectedSection: ShellSection;
  attentionCount: number;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onSectionChange: (section: ShellSection) => void;
  onSearch: () => void;
  onFilter: () => void;
  children: ReactNode;
}

export function PhoneShell({
  selectedSection,
  attentionCount,
  drawerOpen,
  onDrawerOpenChange,
  onSectionChange,
  onSearch,
  onFilter,
  children,
}: PhoneShellProps) {
  const drawerWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer')),
  );
  const visibleScreenWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer-peek')),
  );
  const dimensions = useWindowDimensions();
  const [layout, setLayout] = useState({
    width: dimensions.width,
    height: dimensions.height,
  });
  const offset = Math.min(
    drawerWidth,
    Math.max(0, layout.width - visibleScreenWidth),
  );
  const chrome = useResolveClassNames('bg-shell-chrome');

  function selectSection(section: ShellSection) {
    onSectionChange(section);
    onDrawerOpenChange(false);
  }

  function sectionButton(section: ShellSection) {
    const { title, icon } = sections[section];
    return (
      <Button
        key={section}
        variant="ghost"
        className={cn(
          'h-12 justify-start gap-3 px-3',
          selectedSection === section && 'bg-sidebar',
        )}
        accessibilityLabel={title}
        accessibilityState={{ selected: selectedSection === section }}
        aria-selected={selectedSection === section}
        onPress={() => selectSection(section)}
      >
        <Icon as={icon} className="size-6" />
        <Text className="flex-1 text-base">{title}</Text>
        {section === 'sessions' && attentionCount > 0 && (
          <Badge
            className="min-w-6 border-0 bg-warning px-1.5"
            accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Session needs' : 'Sessions need'} attention`}
          >
            <Text className="text-xs font-semibold text-warning-foreground">
              {attentionCount > 99 ? '99+' : attentionCount}
            </Text>
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <View
      testID="phone-shell"
      className="flex-1 overflow-hidden bg-shell-chrome"
      onLayout={({ nativeEvent }) => setLayout(nativeEvent.layout)}
    >
      <Drawer
        open={drawerOpen}
        onOpen={() => onDrawerOpenChange(true)}
        onClose={() => onDrawerOpenChange(false)}
        drawerType="back"
        drawerPosition="left"
        configureGestureHandler={(gesture) => gesture.failOffsetY([-24, 24])}
        drawerStyle={[chrome, { width: offset }]}
        overlayStyle={{ backgroundColor: 'transparent' }}
        overlayAccessibilityLabel="Close navigation"
        layout={layout}
        renderDrawerContent={() => (
          <View
            className="flex-1 py-3"
            aria-hidden={!drawerOpen}
            accessibilityElementsHidden={!drawerOpen}
          >
            <View className="h-16 justify-center px-6">
              <Text role="heading" aria-level={2} className="text-xl font-bold">
                Argo
              </Text>
            </View>
            <View className="gap-1 px-3">
              {(['sessions', 'issues', 'atlas'] as const).map(sectionButton)}
            </View>
            <View className="flex-1" />
            <View className="px-3">{sectionButton('settings')}</View>
          </View>
        )}
      >
        <PhoneShellCard drawerOpen={drawerOpen}>
          <PhoneListHeader
            title={sections[selectedSection].title}
            attentionCount={attentionCount}
            onMenu={() => onDrawerOpenChange(true)}
            onSearch={onSearch}
            onFilter={onFilter}
          />
          {children}
        </PhoneShellCard>
      </Drawer>
    </View>
  );
}
