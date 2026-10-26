import type { IconName } from '@repo/kit/symbols/icon-names';
import { Platform } from 'react-native';

// A list's filter in a header: Android's top app bar draws Material's filter list; iOS and the web keep the sliders.
export const headerFilterIcon: Extract<IconName, 'filter-list' | 'filters'> =
  Platform.OS === 'android' ? 'filter-list' : 'filters';
