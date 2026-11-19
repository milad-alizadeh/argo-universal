import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import type * as React from 'react';
import { useCallback, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, {
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useStageReveal } from './voice-stage-motion';
import { VoiceStageView, type VoiceStageViewProps } from './voice-stage-view';

export const voiceStageRoomId = 'voice-stage-room';

export interface VoiceStageRevealProps {
  // The call's stage while it runs in this Session; absent once it ends, when the stage leaves.
  stage?: VoiceStageViewProps;
}

interface KeptStage {
  kept: VoiceStageViewProps | undefined;
  // Lets the stage go once it has left.
  forget: () => void;
}

const isNewStage = (
  stage: VoiceStageViewProps | undefined,
  kept: VoiceStageViewProps | undefined,
): boolean => stage !== undefined && stage !== kept;

// The last stage the call drew: it stays on screen, as it was, while it leaves.
function useKeptStage(stage: VoiceStageViewProps | undefined): KeptStage {
  const [kept, setKept] = useState(stage);

  if (isNewStage(stage, kept)) setKept(stage);

  const forget = useCallback(() => setKept(undefined), []);

  return { kept: stage ?? kept, forget };
}

interface Room {
  style: ReturnType<typeof useAnimatedStyle>;
  measure: (event: LayoutChangeEvent) => void;
}

// The room above the Feed is the stage's own height, measured, times how far it has opened.
function useRoom(open: SharedValue<number>): Room {
  const height = useSharedValue(0);

  const style = useAnimatedStyle(
    () => ({ height: height.get() * Math.max(0, open.get()) }),
    [height, open],
  );

  const measure = useCallback(
    (event: LayoutChangeEvent) => height.set(event.nativeEvent.layout.height),
    [height],
  );

  return { style, measure };
}

type StageProps = VoiceStageViewProps & {
  leaving: boolean;
  onLeft: () => void;
};

function Stage({ leaving, onLeft, ...stage }: StageProps): React.JSX.Element {
  const reveal = useStageReveal(leaving, onLeft);
  const room = useRoom(reveal.open);

  return (
    <Animated.View
      testID={voiceStageRoomId}
      className="w-full shrink-0 overflow-hidden"
      style={room.style}
    >
      <View onLayout={room.measure}>
        <VoiceStageView {...stage} reveal={reveal} />
      </View>
    </Animated.View>
  );
}

/*
 * The stage coming and going with the call: the room above the Feed opens as the orb springs into it and its label
 * follows, and when the call ends the same moves run in reverse before the room closes. All of it runs on the UI
 * thread; reduced motion fades the orb and label and opens and closes the room in one step.
 */
export function VoiceStageReveal({
  stage,
}: VoiceStageRevealProps): React.JSX.Element | null {
  const { kept, forget } = useKeptStage(stage);

  return kept ? <Stage {...kept} leaving={!stage} onLeft={forget} /> : null;
}
