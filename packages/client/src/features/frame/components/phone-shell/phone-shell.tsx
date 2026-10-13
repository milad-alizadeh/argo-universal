import type * as React from 'react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import {
  type LayoutChangeEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable, useResolveClassNames } from 'uniwind';
import {
  PhoneDrawer,
  type PhoneDrawerProps,
} from '../phone-drawer/phone-drawer';
import { PhoneShellCard } from '../phone-shell-card/phone-shell-card';
import type { Section } from '../shell-sections';
import { headerBarHeight } from './header-bar-height';
import { PhoneDrawerContent } from './phone-drawer-content';

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
  // Floats just under the section's header, so the page under it never moves.
  banner?: ReactNode;
  children: ReactNode;
}

type ShellLayout = PhoneDrawerProps['layout'];

type DrawerSetup = Omit<PhoneDrawerProps, 'children'>;

function useShellLayout(): {
  layout: ShellLayout;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const dimensions = useWindowDimensions();
  const [layout, setLayout] = useState({
    width: dimensions.width,
    height: dimensions.height,
  });
  return {
    layout,
    onLayout: ({ nativeEvent }) => setLayout(nativeEvent.layout),
  };
}

function useDrawerWidth(layoutWidth: number): number {
  const drawerWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer')),
  );
  const visibleScreenWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer-peek')),
  );
  return Math.min(drawerWidth, Math.max(0, layoutWidth - visibleScreenWidth));
}

function drawerToggle({
  drawerOpen,
  onDrawerOpenChange,
}: PhoneShellProps): Pick<PhoneDrawerProps, 'open' | 'onOpen' | 'onClose'> {
  return {
    open: drawerOpen,
    onOpen: () => onDrawerOpenChange(true),
    onClose: () => onDrawerOpenChange(false),
  };
}

interface ShellDrawerSource {
  layout: ShellLayout;
  shell: PhoneShellProps;
}

function useShellDrawer({ layout, shell }: ShellDrawerSource): DrawerSetup {
  const width = useDrawerWidth(layout.width);
  return {
    ...drawerToggle(shell),
    width,
    surfaceStyle: useResolveClassNames('bg-sidebar'),
    layout,
    swipeEnabled: shell.swipeEnabled ?? true,
    renderDrawerContent: () => <PhoneDrawerContent {...shell} width={width} />,
  };
}

function ShellCard(shell: PhoneShellProps): React.JSX.Element {
  return (
    <PhoneShellCard drawerOpen={shell.drawerOpen}>
      <OpenDrawerContext.Provider value={() => shell.onDrawerOpenChange(true)}>
        <AttentionCountContext.Provider value={shell.attentionCount}>
          {shell.children}
        </AttentionCountContext.Provider>
      </OpenDrawerContext.Provider>
      <ShellBanner>{shell.banner}</ShellBanner>
    </PhoneShellCard>
  );
}

// The gap between the header bar and the banner.
const bannerGap = 8;

function ShellBanner({ children }: { children: ReactNode }): React.JSX.Element {
  const { top } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ top: top + headerBarHeight + bannerGap }}
    >
      {children}
    </View>
  );
}

export function PhoneShell(shell: PhoneShellProps): React.JSX.Element {
  const { layout, onLayout } = useShellLayout();
  const drawer = useShellDrawer({ layout, shell });
  return (
    <View
      testID="phone-shell"
      className="flex-1 overflow-hidden bg-sidebar"
      onLayout={onLayout}
    >
      <PhoneDrawer {...drawer}>
        <ShellCard {...shell} />
      </PhoneDrawer>
    </View>
  );
}
