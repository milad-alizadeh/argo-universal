import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import type { VoiceSpectrum } from '../../types/conversation-connection';
import type { BandFrame } from './band-frame';
import {
  type BarLayout,
  barLayoutOf,
  barLeft,
  barWidth,
  stripHeight,
} from './band-layout';
import { bandLookOf, type BandLook, type EdgeCall } from './band-state';
import { useBandFrame } from './use-band-frame';

export interface ConversationEdgeBandProps {
  call: EdgeCall;
  // How long the call has run, as the timer reads it.
  elapsed: string;
  // The call's bands of speech, read each frame. A phone carries no call audio yet, so it has none and the bars rest.
  spectrum?: () => VoiceSpectrum;
}

interface BarProps {
  index: number;
  left: number;
  frame: SharedValue<BandFrame>;
}

// A bar's height and colour, set on the UI thread from the shared frame.
function useBarStyle({
  index,
  frame,
}: Pick<BarProps, 'index' | 'frame'>): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => {
    const height = frame.get().heights[index] ?? barWidth;

    return {
      height,
      top: (stripHeight - height) / 2,
      backgroundColor: frame.get().fills[index],
    };
  }, [frame, index]);
}

const barBox = {
  position: 'absolute',
  width: barWidth,
  borderRadius: barWidth / 2,
} as const;

function Bar(props: BarProps): React.JSX.Element {
  return (
    <Animated.View
      testID="voice-band-bar"
      style={[barBox, { left: props.left }, useBarStyle(props)]}
    />
  );
}

interface StripProps {
  state: BandLook['state'];
  spectrum?: () => VoiceSpectrum;
}

const measured = (event: LayoutChangeEvent): number =>
  event.nativeEvent.layout.width;

interface BarsProps extends StripProps {
  width: number;
}

const barsOf = (
  layout: BarLayout,
  frame: SharedValue<BandFrame>,
): React.JSX.Element[] =>
  Array.from({ length: layout.count }, (_, index) => (
    <Bar
      key={index}
      index={index}
      left={barLeft(index, layout)}
      frame={frame}
    />
  ));

function Bars({ width, state, spectrum }: BarsProps): React.JSX.Element {
  const layout = barLayoutOf(width);

  return <>{barsOf(layout, useBandFrame(state, layout.count, spectrum))}</>;
}

// The bars fill the room the label leaves; their count follows its width.
function BarStrip(props: StripProps): React.JSX.Element {
  const [width, setWidth] = useState(0);

  return (
    <View
      testID="voice-band-strip"
      aria-hidden
      className="min-w-0 flex-1"
      style={{ height: stripHeight }}
      onLayout={(event) => setWidth(measured(event))}
    >
      <Bars width={width} {...props} />
    </View>
  );
}

// The timer waits until the call connects; its digits are tabular, so it does not shift the label as it counts.
function Timer({ elapsed }: { elapsed: string }): React.JSX.Element {
  return (
    <View className="tabular-nums">
      <Text role="secondary" tone="muted">
        {elapsed}
      </Text>
    </View>
  );
}

// The label hugs its words, so the bars take every point it leaves.
interface LabelProps {
  look: BandLook;
  elapsed: string;
}

function BandLabel({ look, elapsed }: LabelProps): React.JSX.Element {
  return (
    <View
      testID="voice-band-label"
      className="ml-4 shrink-0 flex-row items-baseline gap-1.25"
    >
      <Text role="badge" tone={look.tone}>
        {look.label}
      </Text>
      {look.timer && <Timer elapsed={elapsed} />}
    </View>
  );
}

const rowClass = 'h-11 w-full flex-row items-center px-4 pt-2.5';

/*
 * The Conversation band along the Composer card's top edge: a row of bars that rest as dots. The person's voice lights
 * them from the left in orange and the Agent's from the right in blue; on a turn the colour sweeps across. The state and
 * the timer sit at the right end, 16 points from the last bar, as the first bar sits 16 points from the card's edge. The
 * Composer stays one card, and typing goes on under it throughout.
 */
export function ConversationEdgeBand(props: ConversationEdgeBandProps): React.JSX.Element {
  const look = bandLookOf(props.call);

  return (
    <View testID="voice-edge-band" className={rowClass}>
      <BarStrip state={look.state} spectrum={props.spectrum} />
      <BandLabel look={look} elapsed={props.elapsed} />
    </View>
  );
}
