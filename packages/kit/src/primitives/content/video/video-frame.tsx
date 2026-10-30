import { videoDefaults } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { type MediaAsset, useMediaUrl } from '#primitives/content/media-url';
import { Spinner } from '#primitives/status/spinner';
import type { VideoControls } from './video-controls';
import type { VideoProps } from './video-props';

type FrameProps = Pick<VideoProps, 'aspect' | 'radius'>;

const aspects = {
  landscape: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-9/16',
} as const;

const radii = { control: 'rounded-control', none: 'rounded-none' } as const;

function frameClass(props: FrameProps): string {
  return cn(
    'w-full overflow-hidden',
    aspects[props.aspect ?? videoDefaults.aspect],
    radii[props.radius ?? videoDefaults.radius],
  );
}

// Black, so the player's letterboxing is part of the frame.
export function VideoFrame(
  props: FrameProps & { children: React.ReactNode },
): React.JSX.Element {
  return (
    <View className={cn(frameClass(props), 'bg-scrim')}>{props.children}</View>
  );
}

// The poster with the platform Spinner, until the first frame draws.
function VideoLoading({ poster }: { poster?: MediaAsset }): React.JSX.Element {
  return (
    <View className="pointer-events-none absolute inset-0 items-center justify-center">
      {poster && <Poster poster={poster} />}
      <Spinner accessibilityLabel="Loading video" />
    </View>
  );
}

function Poster({ poster }: { poster: MediaAsset }): React.JSX.Element {
  const url = useMediaUrl()(poster);

  return (
    <Image
      source={typeof url === 'number' ? url : { uri: url }}
      resizeMode="contain"
      className="absolute inset-0 size-full"
    />
  );
}

const focusRing =
  'web:outline-none web:focus-visible:ring-3 web:focus-visible:ring-focus/50';

const errorClass = 'items-center justify-center border border-border bg-muted';

// A muted frame with a broken image; pressing it loads the video again.
type VideoErrorProps = FrameProps &
  Pick<VideoProps, 'accessibilityLabel'> & { onRetry: () => void };

export function VideoError(props: VideoErrorProps): React.JSX.Element {
  return (
    <Pressable
      {...retryLabels(props.accessibilityLabel)}
      onPress={props.onRetry}
      className={cn(frameClass(props), errorClass, focusRing)}
    >
      <Icon name="image-broken" size="md" tone="muted" />
    </Pressable>
  );
}

const retryLabels = (
  label: string,
): React.ComponentProps<typeof Pressable> => ({
  role: 'button',
  accessibilityLabel: `Retry ${label}`,
  accessibilityHint: 'The video could not play',
});

export interface VideoOverlaysProps {
  loading: boolean;
  poster?: MediaAsset;
  controls: VideoControls;
  label: string;
}

// Over the player: the loading poster, and the press that shows an autoplaying video's controls.
export function VideoOverlays(props: VideoOverlaysProps): React.JSX.Element {
  return (
    <>
      {props.loading && <VideoLoading poster={props.poster} />}
      {!props.controls.shown && (
        <RevealControls label={props.label} onPress={props.controls.reveal} />
      )}
    </>
  );
}

// Over an autoplaying video: pressing it, or Enter or Space on the web, shows the player's controls.
function RevealControls(props: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={props.label}
      accessibilityHint="Shows the video controls"
      onPress={props.onPress}
      className={cn('absolute inset-0', focusRing)}
    />
  );
}
