import type { RefCallback } from 'react';
import type { ViewInstance } from 'react-native';

export interface ListVisibility {
  visible: boolean;
  attach: RefCallback<ViewInstance>;
}
