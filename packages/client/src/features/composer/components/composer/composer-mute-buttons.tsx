import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
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
  voice?.call === 'connected' ? voice.mutes : undefined;

export function ComposerMuteButtons({
  voice,
}: {
  voice: ComposerVoice | undefined;
}): React.JSX.Element | null {
  const mutes = mutesOf(voice);

  return mutes ? (
    <>
      <MuteIconButton {...microphoneOf(mutes)} />
      <MuteIconButton {...speakerOf(mutes)} />
    </>
  ) : null;
}
