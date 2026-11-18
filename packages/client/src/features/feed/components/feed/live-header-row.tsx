import { motionDuration } from '@repo/kit/motion';
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useState,
} from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { LiveHeader } from '../live-header/live-header';
import type { LiveHeaderEntry } from './feed-entry';

type Height = [number, (height: number) => void];

const MeasuredHeight = createContext<Height>([0, (): void => {}]);

// Keep the measurement with this Feed when its virtualized Working cell scrolls offscreen.
export function LiveHeaderMeasurement({
  children,
}: PropsWithChildren): React.JSX.Element {
  const measured = useState(0);

  return <MeasuredHeight value={measured}>{children}</MeasuredHeight>;
}

interface Props {
  entry: LiveHeaderEntry;
  now?: number;
  spaceBefore?: string;
}

const fadeWorking = FadeOut.duration(motionDuration.frame);

function WorkingLine({ entry, now, spaceBefore }: Props): React.JSX.Element {
  const [, measure] = useContext(MeasuredHeight);
  const { liveHeader, toolCall } = entry;

  return (
    <Animated.View
      exiting={fadeWorking}
      onLayout={({ nativeEvent }) => measure(nativeEvent.layout.height)}
    >
      {spaceBefore && <View className={spaceBefore} />}
      <LiveHeader liveHeader={liveHeader} toolCall={toolCall} now={now} />
    </Animated.View>
  );
}

export function LiveHeaderRow(props: Props): React.JSX.Element {
  const [height] = useContext(MeasuredHeight);
  const { closing } = props.entry;

  return (
    <View style={closing ? { height } : undefined} aria-hidden={closing}>
      {!closing && <WorkingLine {...props} />}
    </View>
  );
}
