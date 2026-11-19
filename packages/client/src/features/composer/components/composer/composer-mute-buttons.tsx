import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  type CallControlsMotion,
  useCallControlsMotion,
} from './composer-call-controls-motion';
import type { ComposerVoice, ComposerVoiceMutes } from './composer-types';

export const microphoneButtonId = 'composer-microphone';

export const speakerButtonId = 'composer-speaker';

type MuteButton = {
  id: string;
  label: string;
  icon: 'voice' | 'voice-off' | 'speaker' | 'speaker-off';
  muted: boolean;
  onPress: () => void;
};

// Mic and speaker: Muted circles beside End, as the Voice page draws them. A muted one swaps to its slashed glyph, in red.
function MuteIconButton(button: MuteButton): React.JSX.Element {
  return (
    <IconButton
      variant="secondary"
      size="sm"
      control
      testID={button.id}
      accessibilityLabel={button.label}
      aria-pressed={button.muted}
      danger={button.muted}
      icon={button.icon}
      onPress={button.onPress}
    />
  );
}

const microphoneOf = (mutes: ComposerVoiceMutes): MuteButton => ({
  id: microphoneButtonId,
  label: mutes.microphone ? 'Unmute microphone' : 'Mute microphone',
  icon: mutes.microphone ? 'voice-off' : 'voice',
  muted: mutes.microphone,
  onPress: mutes.onMicrophone,
});

const speakerOf = (mutes: ComposerVoiceMutes): MuteButton => ({
  id: speakerButtonId,
  label: mutes.speaker ? 'Unmute speaker' : 'Mute speaker',
  icon: mutes.speaker ? 'speaker-off' : 'speaker',
  muted: mutes.speaker,
  onPress: mutes.onSpeaker,
});

// Only a connected call can be muted: while it connects, End alone shows.
const mutesOf = (
  voice: ComposerVoice | undefined,
): ComposerVoiceMutes | undefined =>
  voice?.kind === 'connected' ? voice.mutes : undefined;

interface KeptMutes {
  mutes: ComposerVoiceMutes | undefined;
  leaving: boolean;
  // Lets the buttons go once they have left.
  forget: () => void;
}

const isNewMutes = (
  mutes: ComposerVoiceMutes | undefined,
  kept: ComposerVoiceMutes | undefined,
): boolean => mutes !== undefined && mutes !== kept;

// The last mutes the call offered: the buttons stay, as they were, while they leave.
function useKeptMutes(mutes: ComposerVoiceMutes | undefined): KeptMutes {
  const [kept, setKept] = useState(mutes);

  if (isNewMutes(mutes, kept)) setKept(mutes);

  const forget = useCallback(() => setKept(undefined), []);

  return { mutes: mutes ?? kept, leaving: !mutes, forget };
}

type ShownMutes = Omit<KeptMutes, 'mutes'> & {
  mutes: ComposerVoiceMutes;
  // A phone keeps only the microphone's mute beside End; a wide window keeps the speaker's too.
  wide: boolean;
};

// Leaving buttons take no press: the call they belonged to has ended.
const muteRowClass = (leaving: boolean): string =>
  cn(
    'shrink-0 flex-row items-center gap-2.5',
    leaving ? 'pointer-events-none' : 'pointer-events-box-none',
  );

function ShownMute(props: {
  style: CallControlsMotion['room'];
  button: MuteButton;
}): React.JSX.Element {
  return (
    <Animated.View style={props.style}>
      <MuteIconButton {...props.button} />
    </Animated.View>
  );
}

function AnimatedMuteButtons(props: ShownMutes): React.JSX.Element {
  const motion = useCallControlsMotion(props.leaving, props.forget);
  const [microphone, speaker] = motion.controls;

  return (
    <Animated.View className="flex-row" style={motion.room}>
      <View className={muteRowClass(props.leaving)} onLayout={motion.measure}>
        <ShownMute style={microphone} button={microphoneOf(props.mutes)} />
        {props.wide && (
          <ShownMute style={speaker} button={speakerOf(props.mutes)} />
        )}
      </View>
    </Animated.View>
  );
}

// Once the call connects the mutes spring in beside End, and they go again as it ends.
export function ComposerMuteButtons({
  voice,
  wide,
}: {
  voice: ComposerVoice | undefined;
  wide: boolean;
}): React.JSX.Element | null {
  const { mutes, ...kept } = useKeptMutes(mutesOf(voice));

  return mutes ? (
    <AnimatedMuteButtons {...kept} mutes={mutes} wide={wide} />
  ) : null;
}
