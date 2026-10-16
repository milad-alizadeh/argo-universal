import type * as React from 'react';
import { View } from 'react-native';

export interface GlassSurfaceProps {
  // The panel's width now, and its width with the sidebar list shown.
  width: number;
  expandedWidth: number;
  transitionKey: string;
  animate: boolean;
}

// The glass panel behind the rail and the sidebar list; on native it follows the panel's animated layout.
export function GlassSurface(_props: GlassSurfaceProps): React.JSX.Element {
  return (
    <View className="pointer-events-none absolute inset-0 rounded-2xl bg-glass shadow-glass" />
  );
}
