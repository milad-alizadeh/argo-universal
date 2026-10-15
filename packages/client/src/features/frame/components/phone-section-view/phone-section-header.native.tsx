import MenuIcon from '@expo/material-symbols/menu.xml';
import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import {
  useOpenDrawer,
  useShellAttentionCount,
} from '../phone-shell/phone-shell';
import { shellSections } from '../shell-sections';
import type { PhoneSectionHeaderProps } from './phone-section-header-props';

const menuIcon = process.env.EXPO_OS === 'ios' ? 'line.3.horizontal' : MenuIcon;

// A phone section root's header, as the Stack Toolbar guide builds one: ☰ before the title, then the section's own toolbar.
export function PhoneSectionHeader({
  section,
  toolbar,
}: PhoneSectionHeaderProps): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: shellSections[section].title }} />
      <MenuToolbar />
      {toolbar}
    </>
  );
}

// ☰ opens the drawer of sections; on Android a dot shows while Sessions need attention.
function MenuToolbar(): React.JSX.Element {
  const openDrawer = useOpenDrawer();
  const attention = useShellAttentionCount() > 0;

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        icon={menuIcon}
        accessibilityLabel="Open navigation"
        onPress={() => openWithHaptic(openDrawer)}
      >
        {toolbarDot(attention)}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function openWithHaptic(openDrawer: () => void): void {
  void impactAsync(ImpactFeedbackStyle.Light);
  openDrawer();
}
