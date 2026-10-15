import ForkLeft from '@expo/material-symbols/fork_left.xml';
import MoreHoriz from '@expo/material-symbols/more_horiz.xml';
import { Stack } from 'expo-router';
import type * as React from 'react';

const changesIcon =
  process.env.EXPO_OS === 'ios' ? 'arrow.triangle.pull' : ForkLeft;

const moreIcon = process.env.EXPO_OS === 'ios' ? 'ellipsis' : MoreHoriz;

// A phone's native header: the plain title, its back button, and two right items. Changed files and the Session menu get their actions in later issues.
export function PhoneSessionHeader({
  title,
}: {
  title: string;
}): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={changesIcon} accessibilityLabel="Changes" />
        <Stack.Toolbar.Button icon={moreIcon} accessibilityLabel="More" />
      </Stack.Toolbar>
    </>
  );
}
