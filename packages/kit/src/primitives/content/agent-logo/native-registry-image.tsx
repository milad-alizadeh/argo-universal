import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml, type XmlProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import {
  type IconSizeValue,
  useIconBox,
  useIconPixels,
} from '../../../symbols/icon-size';
import type { LoadedIconProps } from './registry-icon-props';
import { type IconSource, decodeSource } from './registry-source';
import { UnavailableIcon } from './unavailable-icon';
import { useSvgText } from './use-svg-text';

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
      <FetchedImage {...props} uri={props.source.uri} fallback={fallback} />
    );

  return fallback;
}

interface FetchedImageProps {
  uri: string;
  size: IconSizeValue;
  image: ImageProps;
  fallback: React.JSX.Element;
}

// The fetched SVG is kept by its URI (svg-text-cache), so a row a list mounts again draws its logo at once; while one loads, its box stays empty at the logo's size, so the row does not move when it arrives.
function FetchedImage(props: FetchedImageProps): React.JSX.Element {
  const svg = useSvgText(props.uri);
  const box = useIconBox(props.size);

  if (svg.status === 'failed') return props.fallback;

  if (svg.status === 'loading') return <View style={box} />;

  return <SvgXml {...props.image} xml={svg.xml} fallback={props.fallback} />;
}

// A registry logo paints with currentColor, which would be black; it takes the foreground, so it reads on a dark surface. A fetched SVG takes it as `color`, an inline one written in.
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
