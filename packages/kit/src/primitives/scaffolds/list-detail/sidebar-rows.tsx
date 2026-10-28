import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import {
  ListPlaceContext,
  listPlaceFacts,
  useListPlace,
} from '../../../list-place';

// A wide web list beside its item holds its rows 8 from its left edge and 14 from its right, as rounded tiles flat on the glass. A list that holds its rows so itself keeps them once inside a ListDetail.
export function SidebarRows(props: { children: ReactNode }): ReactNode {
  const inSidebar = listPlaceFacts(useListPlace()).sidebar;

  if (Platform.OS !== 'web' || inSidebar) return props.children;

  return <Rows>{props.children}</Rows>;
}

const Rows = (props: { children: ReactNode }): ReactElement => (
  <ListPlaceContext value="sidebar">
    <View className="flex-1 pb-3 pl-2 pr-3.5">{props.children}</View>
  </ListPlaceContext>
);
