import type { LegendListRef } from '@legendapp/list/react-native';
import type { ScrollViewInstance } from 'react-native';

// A board of lanes: the one ScrollView that scrolls the lanes sideways (each lane scrolls its own rows).
export type ListBoardRef = Pick<
  ScrollViewInstance,
  'scrollTo' | 'scrollToEnd' | 'flashScrollIndicators'
>;

/*
 * What a List's `ref` receives: the LegendList its rows scroll on, or, while its Sections draw as lanes on a wide
 * window, the board. A List of `items` never draws lanes, so its ref is always the LegendList.
 */
export type ListRef = LegendListRef | ListBoardRef;

// The board has no `getState`; a LegendList does.
export const isLegendList = (ref: ListRef): ref is LegendListRef =>
  'getState' in ref;
