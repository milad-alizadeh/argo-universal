import { Platform } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';

export const docksSearch =
  hasLiquidGlass && Platform.OS === 'ios' && !Platform.isPad;
