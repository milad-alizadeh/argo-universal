import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import type {
  ComposerVoice,
  ComposerVoiceElsewhere,
  ComposerVoiceMutes,
} from './composer-types';

export const microphoneButtonId = 'composer-microphone';

export const speakerButtonId = 'composer-speaker';

export const callPointerId = 'composer-call-pointer';

type MuteButton = {
  id: string;
  label: string;
  // The glyph while sound passes, and the one while it is muted.
  on: 'voice' | 'speaker';
  off: 'voice-off' | 'speaker-off';
  muted: boolean;
  onPress: () => void;
};

// Mic and speaker: Muted circles beside End, as the Voice page draws them. A muted one swaps to its slashed glyph.
function MuteIconButton(button: MuteButton): React.JSX.Element {
  return (
    <IconButton
      variant="secondary"
      size="sm"
      control
      testID={button.id}
      accessibilityLabel={button.label}
      aria-pressed={button.muted}
      icon={button.muted ? button.off : button.on}
      onPress={button.onPress}
    />
  );
}

const buttonsOf = (mutes: ComposerVoiceMutes): MuteButton[] => [
  {
    id: microphoneButtonId,
    label: mutes.microphone ? 'Unmute microphone' : 'Mute microphone',
    on: 'voice',
    off: 'voice-off',
    muted: mutes.microphone,
    onPress: mutes.onMicrophone,
  },
  {
    id: speakerButtonId,
    label: mutes.speaker ? 'Unmute speaker' : 'Mute speaker',
    on: 'speaker',
    off: 'speaker-off',
    muted: mutes.speaker,
    onPress: mutes.onSpeaker,
  },
];

// Only a connected call can be muted: while it connects, End alone shows.
export function ComposerMuteButtons({
  voice,
}: {
  voice: ComposerVoice | undefined;
}): React.JSX.Element | null {
  if (voice?.call !== 'connected' || !voice.mutes) return null;

  return (
    <>
      {buttonsOf(voice.mutes).map((button) => (
        <MuteIconButton key={button.id} {...button} />
      ))}
    </>
  );
}

const ringSize = 28;

const ringRadius = 11.5;

const ringStroke = 1.6;

const turnMilliseconds = 900;

// A quarter of the ring, drawn from twelve o'clock round to three.
const arcPath = 'M14 2.5A11.5 11.5 0 0 1 25.5 14';

function useTurn(): SharedValue<number> {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(
      withRepeat(
        withTiming(1, { duration: turnMilliseconds, easing: Easing.linear }),
        -1,
      ),
    );

    return (): void => cancelAnimation(turn);
  }, [turn]);

  return turn;
}

/*
 * Option B of the Voice page's connecting state: End's X is already there, and an arc turns round it inside the circle.
 * It sits over the End button and takes no press, so pressing End still cancels the call.
 */
export function ConnectingRing(): React.JSX.Element {
  const turn = useTurn();
  const [track, arc] = useCSSVariable([
    '--color-neutral-600',
    '--color-primary-foreground',
  ]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * 360}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      testID="composer-connecting"
      className="absolute inset-0"
      style={style}
    >
      <Svg width={ringSize} height={ringSize} viewBox="0 0 28 28" fill="none">
        <Circle
          cx={14}
          cy={14}
          r={ringRadius}
          stroke={String(track)}
          strokeWidth={ringStroke}
        />
        <Path
          d={arcPath}
          stroke={String(arc)}
          strokeWidth={ringStroke}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

// The call runs in another Session: the voice button's slot says where, and takes the person there.
export function ComposerCallPointer({
  elsewhere,
}: {
  elsewhere: ComposerVoiceElsewhere | undefined;
}): React.JSX.Element | null {
  if (!elsewhere) return null;

  return (
    <Button
      testID={callPointerId}
      variant="secondary"
      size="sm"
      label={`Call in ${elsewhere.title}`}
      onPress={elsewhere.onOpen}
    />
  );
}
