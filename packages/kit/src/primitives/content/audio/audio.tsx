import {
  type AudioPlayer,
  type AudioStatus,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import type * as React from 'react';
import { useEffect } from 'react';
import { useMediaUrl } from '#primitives/content/media-url';
import type { AudioProps } from './audio-props';
import { type AudioPhase, AudioTransport } from './audio-transport';
import { forget, playOnly } from './one-clip';

const updateInterval = 250;

// expo-audio plays the clip on every platform: AVPlayer on iOS, Media3 on Android, an audio element on the web.
export function Audio(props: AudioProps): React.JSX.Element {
  const mediaUrl = useMediaUrl();
  const url = (): string | number => mediaUrl(props.source);
  const { player, status } = useClip(url());

  return (
    <AudioTransport
      label={props.accessibilityLabel}
      phase={phase(status)}
      currentTime={status.currentTime}
      duration={status.duration}
      onToggle={(): void => toggle(player, status, url)}
      onSeek={(seconds): void => void player.seekTo(seconds)}
    />
  );
}

interface Clip {
  player: AudioPlayer;
  status: AudioStatus;
}

function useClip(url: string | number): Clip {
  const player = useAudioPlayer(url, { updateInterval });

  useEffect(() => (): void => forget(player), [player]);

  return { player, status: useAudioPlayerStatus(player) };
}

function phase(status: AudioStatus): AudioPhase {
  if (status.error) return 'error';

  return status.isLoaded ? playback(status) : 'loading';
}

const playback = (status: AudioStatus): AudioPhase =>
  status.playing ? 'playing' : 'paused';

// After an error, the play button asks for the URL again and loads the clip.
function toggle(
  player: AudioPlayer,
  status: AudioStatus,
  url: () => string | number,
): void {
  if (status.error) return player.replace(url());

  if (status.playing) return player.pause();

  start(player, status);
}

// A finished clip starts again from the beginning.
function start(player: AudioPlayer, status: AudioStatus): void {
  if (finished(status)) void player.seekTo(0);
  // A clip the person starts plays with the ring switch on silent, like a video.
  void setAudioModeAsync({ playsInSilentMode: true });
  playOnly(player);
}

const finished = (status: AudioStatus): boolean =>
  status.duration > 0 && status.currentTime >= status.duration;
