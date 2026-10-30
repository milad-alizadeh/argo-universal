import { imageDefaults } from '@repo/contracts/kit-tokens';
import { Image as ExpoImage } from 'expo-image';
import type { ComponentProps } from 'react';
import { withUniwind } from 'uniwind';
import type { FrameProps } from './image-frame';

const Picture = withUniwind(ExpoImage);

type LoadedProps = FrameProps & {
  failed: boolean;
  onError: () => void;
  onRatio: (ratio: number) => void;
};

export function LoadedImage(props: LoadedProps): React.ReactNode {
  if (props.uri === undefined || props.failed) return null;

  return <Picture {...pictureProps(props)} />;
}

function pictureProps(props: LoadedProps): ComponentProps<typeof Picture> {
  return {
    source: props.uri,
    className: 'size-full',
    contentFit: props.fit ?? imageDefaults.fit,
    accessible: false,
    recyclingKey: String(props.uri),
    onError: props.onError,
    onLoad: ({ source }) =>
      props.onRatio(source.width / Math.max(1, source.height)),
  };
}
