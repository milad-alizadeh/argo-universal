import type * as React from 'react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable, useResolveClassNames } from 'uniwind';
import { Badge } from '#lib/generic/primitives/badge';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon } from '../../../lib/generic/symbols/icon';
import { attentionBadge } from '../state/attention-badge';
import { PhoneDrawer } from './phone-drawer';
import { PhoneShellCard } from './phone-shell-card';
import { type Section, shellSections } from './shell-sections';

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
  selectedSection: Section;
  attentionCount: number;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onDrawerClosed?: () => void;
  onSectionChange: (section: Section) => void;
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

  function selectSection(section: Section): void {
    onSectionChange(section);
    onDrawerOpenChange(false);
  }

  function sectionButton(section: Section): React.JSX.Element {
    const { title, icon } = shellSections[section];
    const badge = attentionBadge(attentionCount);
    return (
      <Pressable
        key={section}
        accessibilityLabel={title}
        accessibilityState={{ selected: selectedSection === section }}
        aria-pressed={selectedSection === section}
        onPress={() => selectSection(section)}
        role="button"
        className={contentActionClass({
          variant: 'ghost',
          className: cn(
            'h-12 sm:h-12 justify-start gap-3 px-3',
            selectedSection === section && 'bg-sidebar',
          ),
        })}
      >
        <Icon
          size="lg"
          name={icon}
          filled={selectedSection === section}
          className={cn(selectedSection !== section && 'text-muted-foreground')}
        />
        <Text role="body" className="flex-1">
          {title}
        </Text>
        {section === 'sessions' && badge && (
          <Badge
            className="h-phone-shell-badge min-w-phone-shell-badge border-0 bg-warning px-1.5"
            accessibilityLabel={badge.label}
          >
            <Text role="badge" className="text-warning-foreground">
              {badge.text}
            </Text>
          </Badge>
        )}
      </Pressable>
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
              <Text role="title" semanticRole="heading" aria-level={2}>
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
