import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { RowDrawingContext } from '../../../row-drawing-context';

// Paper's SettingsList: a wide web list beside its item holds its rows 8 from its left edge and 14 from its right, as rounded tiles flat on the glass.
export function SidebarRows(props: { children: ReactNode }): ReactNode {
  if (Platform.OS !== 'web') return props.children;

  return <Rows>{props.children}</Rows>;
}

const Rows = (props: { children: ReactNode }): ReactElement => (
  <RowDrawingContext value="sidebar">
    <View className="flex-1 pb-3 pl-2 pr-3.5">{props.children}</View>
  </RowDrawingContext>
);
