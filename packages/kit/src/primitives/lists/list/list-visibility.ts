import type { RefCallback } from 'react';
import type { View } from 'react-native';

export interface ListVisibility {
  visible: boolean;
  attach: RefCallback<View>;
}
