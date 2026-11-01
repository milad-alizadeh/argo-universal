import type * as React from 'react';
import { View } from 'react-native';

// A dark frame standing in for the live camera, which a browser has none of; the corner marks are the camera's own drawing on a phone.
export const cameraFixture: React.JSX.Element = (
  <View className="flex-1 bg-muted" />
);
