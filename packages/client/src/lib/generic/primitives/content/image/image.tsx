import { useUniwind } from 'uniwind';
import { useMediaUrl } from '#primitives/content/media-url';
import type { KitProps } from '../../kit-props';
import { ImageFrame } from './image-frame';

export type ImageProps = KitProps<'Image'>;

function appearanceSource(
  props: ImageProps,
  dark: boolean,
): ImageProps['source'] {
  const themed = dark ? darkSource(props) : undefined;

  return themed ?? fallbackSource(props);
}

function darkSource(props: ImageProps): ImageProps['source'] {
  return props.sources?.dark;
}

function fallbackSource(props: ImageProps): ImageProps['source'] {
  return props.sources?.light ?? props.source;
}

export function Image(props: ImageProps): React.JSX.Element {
  const { theme } = useUniwind();
  const asset = appearanceSource(props, theme === 'dark');
  const url = useMediaUrl();
  const uri = asset ? url(asset) : undefined;

  return <ImageFrame key={String(uri)} {...props} uri={uri} />;
}
