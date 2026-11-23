import { Platform } from 'react-native';
import { usesIPadSplitView } from './ipad-split-view';

export const nativeFrame = usesIPadSplitView(
  Platform.OS,
  Platform.OS === 'ios' && Platform.isPad,
  Platform.Version,
);
