import type * as React from 'react';
import { View } from 'react-native';

// The dark rounded frame the camera fills on the scan page (#1490), which a browser and the waiting page draw without a camera.
export function ScannerFrame(): React.JSX.Element {
  return <View className="flex-1 rounded-2xl bg-scrim" />;
}
