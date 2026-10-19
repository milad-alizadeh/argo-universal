import type * as React from 'react';
import { useState } from 'react';
import { useMediaUrl } from '#primitives/content/media-url';
import {
  useQuietPlay,
  useVideoControls,
  type VideoControls,
} from './video-controls';
import { VideoError, VideoFrame, VideoOverlays } from './video-frame';
import type { VideoProps } from './video-props';

type VideoAttributes = React.VideoHTMLAttributes<HTMLVideoElement>;

// The browser's own player: its controls take focus, Space plays or pauses and the arrow keys seek.
export function Video(props: VideoProps): React.JSX.Element {
  const attempt = useAttempt();

  if (attempt.failed) return <VideoError {...props} onRetry={attempt.retry} />;

  return (
    <BrowserPlayer key={attempt.count} {...props} onError={attempt.fail} />
  );
}

interface Attempt {
  count: number;
  failed: boolean;
  fail: () => void;
  retry: () => void;
}

// A retry mounts a fresh video element, which loads the source again.
function useAttempt(): Attempt {
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(false);

  return {
    count,
    failed,
    fail: (): void => setFailed(true),
    retry: (): void => {
      setFailed(false);
      setCount(count + 1);
    },
  };
}

type BrowserPlayerProps = VideoProps & { onError: () => void };

function BrowserPlayer(props: BrowserPlayerProps): React.JSX.Element {
  const player = useBrowserPlayer(props);

  return (
    <VideoFrame {...props}>
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- the Plugin wire carries no captions yet. */}
      <video {...player.attributes} />
      <VideoOverlays
        loading={player.loading}
        controls={player.controls}
        label={props.accessibilityLabel}
      />
    </VideoFrame>
  );
}

interface BrowserPlayer {
  attributes: VideoAttributes;
  loading: boolean;
  controls: VideoControls;
}

function useBrowserPlayer(props: BrowserPlayerProps): BrowserPlayer {
  const [loading, setLoading] = useState(true);
  const quiet = useQuietPlay(props.autoPlay);
  const controls = useVideoControls(quiet);
  const source = useSourceAttributes(props);

  return {
    attributes: {
      ...source,
      ...playAttributes(quiet, controls.shown),
      onLoadedData: (): void => setLoading(false),
    },
    loading,
    controls,
  };
}

function useSourceAttributes(props: BrowserPlayerProps): VideoAttributes {
  const mediaUrl = useMediaUrl();

  return {
    src: String(mediaUrl(props.source)),
    poster: props.poster && String(mediaUrl(props.poster)),
    'aria-label': props.accessibilityLabel,
    className: 'size-full object-contain',
    onError: props.onError,
  };
}

const playAttributes = (
  quiet: boolean,
  controls: boolean,
): VideoAttributes => ({
  controls,
  autoPlay: quiet,
  muted: quiet,
  loop: quiet,
  playsInline: true,
});
