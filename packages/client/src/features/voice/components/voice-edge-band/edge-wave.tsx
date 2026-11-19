import type * as React from 'react';
import { View } from 'react-native';
import type { EdgeWaveProps } from './edge-wave-props';

/*
 * A phone carries no Voice call's audio yet and has no canvas to draw on, so its band keeps the waveform's room and
 * draws no bars; the label beside it still says the state. The web and desktop drawing is `edge-wave.web.tsx`.
 */
export function EdgeWave(_props: EdgeWaveProps): React.JSX.Element {
  return <View className="h-3.5 min-w-0 flex-1" />;
}
