import type * as React from 'react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable, useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { PhoneDrawer } from './phone-drawer';
import { PhoneShellCard } from './phone-shell-card';
import { type ShellSection, shellSections } from './shell-sections';
import { maximumAttentionBadgeCount } from './attention-badge';

export type { ShellSection } from './shell-sections';

const OpenDrawerContext = createContext<() => void>(() => {});

const AttentionCountContext = createContext(0);

// The shell's attention count, for ☰'s dot.
export function useShellAttentionCount(): number {
  return useContext(AttentionCountContext);
}

// Opens the phone shell's drawer from a section's header.
export function useOpenDrawer(): () => void {
  return useContext(OpenDrawerContext);
}

export interface PhoneShellProps {
  selectedSection: ShellSection;
  attentionCount: number;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onDrawerClosed?: () => void;
  onSectionChange: (section: ShellSection) => void;
  swipeEnabled?: boolean;
  children: ReactNode;
}

export function PhoneShell({
  selectedSection,
  attentionCount,
  drawerOpen,
  onDrawerOpenChange,
  onDrawerClosed,
  onSectionChange,
  swipeEnabled = true,
  children,
}: PhoneShellProps): React.JSX.Element {
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
  const { top } = useSafeAreaInsets();

  function selectSection(section: ShellSection): void {
    onSectionChange(section);
    onDrawerOpenChange(false);
  }

  function sectionButton(section: ShellSection): React.JSX.Element {
    const { title, icon } = shellSections[section];
    return (
      <Button
        key={section}
        variant="ghost"
        className={cn(
          'h-12 sm:h-12 justify-start gap-3 px-3',
          selectedSection === section && 'bg-sidebar',
        )}
        accessibilityLabel={title}
        accessibilityState={{ selected: selectedSection === section }}
        aria-selected={selectedSection === section}
        onPress={() => selectSection(section)}
      >
        <Icon
          size="lg"
          as={icon}
          weight={selectedSection === section ? 'fill' : 'regular'}
          className={cn(selectedSection !== section && 'text-muted-foreground')}
        />
        <Text
          className={cn(
            'flex-1 text-base',
            selectedSection === section ? 'font-semibold' : 'font-normal',
          )}
        >
          {title}
        </Text>
        {section === 'sessions' && attentionCount > 0 && (
          <Badge
            className="h-phone-shell-badge min-w-phone-shell-badge border-0 bg-warning px-1.5"
            accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Session needs' : 'Sessions need'} attention`}
          >
            <Text className="text-xs font-semibold text-warning-foreground">
              {attentionCount > maximumAttentionBadgeCount
                ? `${maximumAttentionBadgeCount}+`
                : attentionCount}
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
      <PhoneDrawer
        open={drawerOpen}
        onOpen={() => onDrawerOpenChange(true)}
        onClose={() => onDrawerOpenChange(false)}
        onClosed={onDrawerClosed}
        width={offset}
        surfaceStyle={chrome}
        layout={layout}
        swipeEnabled={swipeEnabled}
        renderDrawerContent={() => (
          <View
            className="flex-1 py-3"
            aria-hidden={!drawerOpen}
            accessibilityElementsHidden={!drawerOpen}
          >
            <View style={{ height: top }} />
            <View className="h-14 justify-center px-6">
              <Text
                role="heading"
                aria-level={2}
                className="text-xl font-semibold"
              >
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
          <OpenDrawerContext.Provider value={() => onDrawerOpenChange(true)}>
            <AttentionCountContext.Provider value={attentionCount}>
              {children}
            </AttentionCountContext.Provider>
          </OpenDrawerContext.Provider>
        </PhoneShellCard>
      </PhoneDrawer>
    </View>
  );
}
