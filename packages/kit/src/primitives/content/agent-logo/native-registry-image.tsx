import { Image, type ImageStyle } from 'expo-image';
import type * as React from 'react';
import { type ComponentProps, useMemo, useState } from 'react';
import { SvgXml, type XmlProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { useIconBox, useIconPixels } from '../../../symbols/icon-size';
import type { LoadedIconProps } from './registry-icon-props';
import { type IconSource, decodeSource } from './registry-source';
import { UnavailableIcon } from './unavailable-icon';

type ImageProps = Pick<
  XmlProps,
  'width' | 'height' | 'color' | 'accessibilityRole' | 'accessibilityLabel'
>;

export function RegistryImage(props: LoadedIconProps): React.JSX.Element {
  const color = useForegroundColor();

  const source = useMemo(
    () => decodeSource(props.uri, color),
    [props.uri, color],
  );

  const image = imageProps(props.agentName, useIconPixels(props.size), color);

  return <SourceImage {...props} source={source} image={image} />;
}

interface SourceImageProps extends LoadedIconProps {
  source: IconSource;
  image: ImageProps;
}

function SourceImage(props: SourceImageProps): React.JSX.Element {
  const fallback = <UnavailableIcon {...props} />;

  if (props.source.kind === 'inline')
    return <SvgXml {...props.image} xml={props.source.xml} />;

  if (props.source.kind === 'uri')
    return (
      <RemoteImage
        key={props.source.uri}
        {...props}
        uri={props.source.uri}
        fallback={fallback}
      />
    );

  return fallback;
}

interface RemoteImageProps extends LoadedIconProps {
  image: ImageProps;
  fallback: React.JSX.Element;
}

// expo-image fetches a remote SVG once and keeps it in memory and on disk, so a row a list mounts again draws its logo at once. The tint paints the logo's one colour as the foreground.
function RemoteImage(props: RemoteImageProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const box = useIconBox(props.size);

  if (failed) return props.fallback;

  return <Image {...remoteProps(props, box)} onError={() => setFailed(true)} />;
}

function remoteProps(
  props: RemoteImageProps,
  box: ImageStyle,
): ComponentProps<typeof Image> {
  return {
    source: props.uri,
    style: box,
    contentFit: 'contain',
    tintColor: tint(props.image.color),
    cachePolicy: 'memory-disk',
    recyclingKey: props.uri,
    accessibilityRole: 'image',
    accessibilityLabel: props.image.accessibilityLabel,
  };
}

const tint = (color: ImageProps['color']): string | undefined =>
  typeof color === 'string' ? color : undefined;

// A registry logo paints with currentColor, which would be black; it takes the foreground, so it reads on a dark surface. A remote SVG is tinted with it, an inline one written in.
function useForegroundColor(): string | undefined {
  const resolved = useResolveClassNames('text-foreground').color;

  return typeof resolved === 'string' ? resolved : undefined;
}

function imageProps(
  agentName: string,
  pixels: number,
  color: string | undefined,
): ImageProps {
  return {
    width: pixels,
    height: pixels,
    color,
    accessibilityRole: 'image',
    accessibilityLabel: `${agentName} icon`,
  };
}
