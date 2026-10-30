import { imageDefaults } from '@repo/contracts/kit-tokens';
import { useContext, useState, type ComponentProps } from 'react';
import { View, type ViewProps } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { ListTileContext } from '../../../list-context';
import { cn } from '../../../utils';
import type { ImageProps } from './image';
import { LoadedImage } from './loaded-image';

export type FrameProps = ImageProps & { uri?: string | number };

const radii = {
  none: '',
  control: 'rounded-control',
  container: 'rounded-2xl',
};

const brokenImage = {
  sf: 'photo.badge.exclamationmark',
  material: 'broken_image',
} as const;

export function ImageFrame(props: FrameProps): React.JSX.Element {
  const state = useImageState(props);

  return (
    <View {...state.frame}>
      <LoadedImage {...state.picture} />
      <ImageError failed={state.failed} />
    </View>
  );
}

interface ImageState {
  failed: boolean;
  frame: ViewProps;
  picture: ComponentProps<typeof LoadedImage>;
}

function useImageState(props: FrameProps): ImageState {
  const [failed, setFailed] = useState(false);
  const [intrinsic, setIntrinsic] = useState(1);
  const ratio = useImageRatio(props.aspect, intrinsic);

  return {
    failed,
    frame: frameProps(props, failed, ratio),
    picture: {
      ...props,
      failed,
      onError: () => setFailed(true),
      onRatio: setIntrinsic,
    },
  };
}

function useImageRatio(
  aspect: ImageProps['aspect'],
  intrinsic: number,
): number {
  const tile = useContext(ListTileContext);

  return tile?.aspect ?? imageRatio(aspect, intrinsic);
}

function imageRatio(aspect: ImageProps['aspect'], intrinsic: number): number {
  return typeof aspect === 'number' ? aspect : intrinsic;
}

function frameProps(
  props: FrameProps,
  failed: boolean,
  ratio: number,
): ViewProps {
  return {
    role: 'img',
    accessible: true,
    accessibilityLabel: imageLabel(props, failed),
    className: imageFrameClass(props.radius),
    style: { aspectRatio: ratio },
  };
}

function imageLabel(props: FrameProps, failed: boolean): string {
  return failed
    ? `${props.accessibilityLabel}, image unavailable`
    : props.accessibilityLabel;
}

function imageFrameClass(radius: ImageProps['radius']): string {
  return cn(
    'w-full overflow-hidden border border-border bg-muted',
    imageRadius(radius),
  );
}

function imageRadius(
  radius: ImageProps['radius'] = imageDefaults.radius,
): string {
  return radii[radius];
}

function ImageError({ failed }: { failed: boolean }): React.ReactNode {
  if (!failed) return null;

  return (
    <View className="absolute inset-0 items-center justify-center">
      <Icon name={brokenImage} tone="muted" />
    </View>
  );
}
