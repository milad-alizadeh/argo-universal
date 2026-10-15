import MenuIcon from '@expo/material-symbols/menu.xml';
import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import {
  useOpenDrawer,
  useShellAttentionCount,
} from './phone-shell/phone-shell';

const menuIcon = process.env.EXPO_OS === 'ios' ? 'line.3.horizontal' : MenuIcon;

// ☰ before a phone section's title; opens the drawer of sections. On Android a dot shows while Sessions need attention.
export function MenuToolbar(): React.JSX.Element {
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
