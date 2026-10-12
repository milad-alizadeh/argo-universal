import type * as React from 'react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable, useResolveClassNames } from 'uniwind';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { attentionBadge } from '../../state/attention-badge';
import { PhoneDrawer } from '../phone-drawer/phone-drawer';
import { PhoneShellCard } from '../phone-shell-card/phone-shell-card';
import { type Section, shellSections } from '../shell-sections';
import { DrawerItem } from './drawer-item';
import { PhoneDrawerBackdrop } from './phone-drawer-backdrop';

// The native header bar's height under the status bar: Material's top app bar on Android, the navigation bar on iOS.
const materialTopAppBar = 56;
const iosNavigationBar = 44;
// Before iOS 26 the bar's items sit higher, 17.5pt below the status bar (measured on iOS 18).
const classicIosNavigationBar = 35;
function barHeight(): number {
  if (Platform.OS === 'android') return materialTopAppBar;
  return hasLiquidGlass ? iosNavigationBar : classicIosNavigationBar;
}
const headerBarHeight = barHeight();

// The content's edge shades the drawer under it, as if the content lay on top.
const contentEdgeShadow =
  'shadow-[inset_-12px_0_16px_-8px_#0000001a] dark:shadow-[inset_-12px_0_16px_-8px_#00000066]';

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
  onSectionChange: (section: Section) => void;
  swipeEnabled?: boolean;
  children: ReactNode;
}

export function PhoneShell({
  selectedSection,
  attentionCount,
  drawerOpen,
  onDrawerOpenChange,
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
  const surface = useResolveClassNames('bg-sidebar');
  const { top } = useSafeAreaInsets();

  function selectSection(section: Section): void {
    onSectionChange(section);
    onDrawerOpenChange(false);
  }

  function sectionButton(section: Section): React.JSX.Element {
    const { title, icon } = shellSections[section];
    return (
      <DrawerItem
        key={section}
        title={title}
        icon={icon}
        selected={selectedSection === section}
        badge={
          (section === 'sessions' && attentionBadge(attentionCount)) ||
          undefined
        }
        onPress={() => selectSection(section)}
      />
    );
  }

  return (
    <View
      testID="phone-shell"
      className="flex-1 overflow-hidden bg-sidebar"
      onLayout={({ nativeEvent }) => setLayout(nativeEvent.layout)}
    >
      <PhoneDrawer
        open={drawerOpen}
        onOpen={() => onDrawerOpenChange(true)}
        onClose={() => onDrawerOpenChange(false)}
        width={offset}
        surfaceStyle={surface}
        layout={layout}
        swipeEnabled={swipeEnabled}
        renderDrawerContent={() => (
          <View
            className="flex-1"
            aria-hidden={!drawerOpen}
            accessibilityElementsHidden={!drawerOpen}
          >
            <PhoneDrawerBackdrop width={offset} />
            {/* Plain translucent glass: over a still, soft glow a blur would cost a filter pass and show nothing. */}
            <View
              className={cn('flex-1 bg-glass px-5 pb-8', contentEdgeShadow)}
              style={{ paddingTop: top }}
            >
              {/* The header bar's own height, so the title sits level with ☰ and the page's title, and the first row level with the page's search. */}
              <View
                className="justify-center px-3"
                style={{ height: headerBarHeight }}
              >
                <Text role="heading" semanticRole="heading" aria-level={2}>
                  Argo
                </Text>
              </View>
              <View className="flex-1 gap-1">
                {(['sessions', 'issues', 'atlas'] as const).map(sectionButton)}
              </View>
              {sectionButton('settings')}
            </View>
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
