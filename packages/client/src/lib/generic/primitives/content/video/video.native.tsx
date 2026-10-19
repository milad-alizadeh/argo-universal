import { useEvent } from 'expo';
import {
  useVideoPlayer,
  type VideoPlayer,
  VideoView,
  type VideoViewProps,
} from 'expo-video';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useMediaUrl } from '#primitives/content/media-url';
import {
  useMutedAutoPlay,
  useVideoControls,
  type VideoControls,
} from './video-controls';
import { VideoError, VideoFrame, VideoOverlays } from './video-frame';
import type { VideoProps } from './video-props';

// expo-video draws the stock player inline: AVPlayerViewController on iOS, Media3 on Android.
export function Video(props: VideoProps): React.JSX.Element {
  const url = useMediaUrl()(props.source);
  const player = useVideoPlayer(url, (created) => muteAndLoop(created, props));

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  if (status === 'error')
    return (
      <VideoError
        {...props}
        onRetry={(): void => void player.replaceAsync(url)}
      />
    );

  return <StockPlayer {...props} player={player} />;
}

function muteAndLoop(player: VideoPlayer, props: VideoProps): void {
  player.muted = props.autoPlay === true;
  player.loop = props.autoPlay === true;
}

type StockPlayerProps = VideoProps & { player: VideoPlayer };

function StockPlayer(props: StockPlayerProps): React.JSX.Element {
  const stock = useStockPlayer(props);

  return (
    <VideoFrame {...props}>
      <VideoView {...stock.view} />
      <VideoOverlays
        loading={stock.loading}
        poster={props.poster}
        controls={stock.controls}
        label={props.accessibilityLabel}
      />
    </VideoFrame>
  );
}

interface StockPlayer {
  view: VideoViewProps;
  loading: boolean;
  controls: VideoControls;
}

// The poster and Spinner stay until the first frame draws.
function useStockPlayer(props: StockPlayerProps): StockPlayer {
  const [firstFrame, setFirstFrame] = useState(false);
  const controls = useVideoControls(useAutoPlay(props.player, props.autoPlay));

  return {
    view: {
      ...viewProps(props, controls.shown),
      onFirstFrameRender: (): void => setFirstFrame(true),
    },
    loading: !firstFrame,
    controls,
  };
}

// An autoplaying video plays at once, and pauses if Reduce Motion turns on.
function useAutoPlay(player: VideoPlayer, autoPlay?: boolean): boolean {
  const playing = useMutedAutoPlay(autoPlay);

  useEffect(() => {
    if (playing) player.play();
    else if (autoPlay) player.pause();
  }, [player, autoPlay, playing]);

  return playing;
}

const viewProps = (
  props: StockPlayerProps,
  nativeControls: boolean,
): VideoViewProps => ({
  player: props.player,
  nativeControls,
  accessibilityLabel: props.accessibilityLabel,
  contentFit: 'contain',
  style: { flex: 1 },
});
