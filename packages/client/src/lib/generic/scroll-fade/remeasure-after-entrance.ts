import type { LegendListRef } from '@legendapp/list/react-native';
import type { RefObject } from 'react';

// Native measures rows by layout, which an ancestor's transform does not change.
export function useRemeasureAfterEntrance(
  _list: RefObject<LegendListRef | null>,
): void {}
