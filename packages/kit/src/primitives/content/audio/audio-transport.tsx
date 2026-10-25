import type * as React from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Slider } from '#primitives/controls/slider';
import { clockTime } from './audio-time';

export type AudioPhase = 'loading' | 'paused' | 'playing' | 'error';

export interface AudioTransportProps {
  label: string;
  phase: AudioPhase;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
}

const playing = (phase: AudioPhase): boolean => phase === 'playing';

// The Paper master's tint tray: play or pause, the scrubber and the time, or a line saying the audio cannot play.
export function AudioTransport(props: AudioTransportProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-tint py-1 pl-1 pr-3 native:pr-4">
      <PlayButton {...props} />
      {props.phase === 'error' ? <Unplayable /> : <Scrubber {...props} />}
    </View>
  );
}

// Loading marks the button busy and ignores presses; after an error it stays enabled and retries.
function PlayButton(props: AudioTransportProps): React.JSX.Element {
  const verb = playing(props.phase) ? 'Pause' : 'Play';

  return (
    <IconButton
      variant="ghost"
      icon={playing(props.phase) ? 'pause' : 'play'}
      accessibilityLabel={`${verb} ${props.label}`}
      aria-busy={props.phase === 'loading'}
      onPress={pressOf(props)}
    />
  );
}

const pressOf = (props: AudioTransportProps): (() => void) | undefined =>
  props.phase === 'loading' ? undefined : props.onToggle;

function Unplayable(): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted" className="flex-1">
      Can’t play this audio
    </Text>
  );
}

function Scrubber(props: AudioTransportProps): React.JSX.Element {
  return (
    <>
      <View className="flex-1">
        <SeekSlider {...props} />
      </View>
      <Text role="secondary" tone="muted" className="tabular-nums">
        {`${clockTime(props.currentTime)} / ${clockTime(props.duration)}`}
      </Text>
    </>
  );
}

// Arrow keys and the assistive adjust actions seek a second at a time.
function SeekSlider(props: AudioTransportProps): React.JSX.Element {
  return (
    <Slider
      value={Math.min(props.currentTime, props.duration)}
      minimumValue={0}
      maximumValue={Math.max(props.duration, 1)}
      step={1}
      disabled={props.phase === 'loading'}
      accessibilityLabel={props.label}
      valueLabel={`${clockTime(props.currentTime)} of ${clockTime(props.duration)}`}
      onValueChange={props.onSeek}
    />
  );
}
