import { Icon } from '@repo/kit/primitives/content/icon';
import {
  type IconSizeValue,
  useIconBox,
  useIconPixels,
} from '@repo/kit/symbols/icon-size';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cssSafeUri } from './css-safe-uri';

export interface RegistryIconProps {
  // The Registry entry's icon; the Agent glyph stands in when it is missing or fails to load.
  uri: string | undefined;
  agentName: string;
  size: IconSizeValue;
}

type IconSource =
  | { kind: 'inline'; xml: string }
  | { kind: 'uri'; uri: string }
  | { kind: 'unavailable' };

type ImageProps = Pick<
  XmlProps,
  'width' | 'height' | 'color' | 'accessibilityRole' | 'accessibilityLabel'
>;

export function RegistryIcon({
  uri,
  agentName,
  size,
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon agentName={agentName} size={size} />;

  return <LoadedImage uri={uri} agentName={agentName} size={size} />;
}

type LoadedIconProps = Required<RegistryIconProps> & { uri: string };

// The browser draws the SVG itself: react-native-svg's web build hands data-name and the like to DOM elements. The CDN's SVGs cannot be fetched (no CORS) and paint black, so dark mode inverts them, keeping hue.
function WebRegistryImage(props: LoadedIconProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) return <UnavailableIcon {...props} />;

  return <WebImage {...props} onError={() => setFailed(true)} />;
}

function WebImage(
  props: LoadedIconProps & { onError: () => void },
): React.JSX.Element {
  return (
    <View className="dark:invert dark:hue-rotate-180">
      <Image
        accessibilityLabel={`${props.agentName} icon`}
        source={{ uri: cssSafeUri(props.uri) }}
        style={useIconBox(props.size)}
        onError={props.onError}
      />
    </View>
  );
}

function RegistryImage(props: LoadedIconProps): React.JSX.Element {
  const color = useForegroundColor();
  const { uri } = props;
  const source = useMemo(() => decodeSource(uri, color), [uri, color]);
  const image = imageProps(props.agentName, useIconPixels(props.size), color);

  return renderIcon(source, image, <UnavailableIcon {...props} />);
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

function renderIcon(
  source: IconSource,
  props: ImageProps,
  fallback: React.JSX.Element,
): React.JSX.Element {
  if (source.kind === 'unavailable') return fallback;

  return source.kind === 'inline' ? (
    <SvgXml {...props} xml={source.xml} />
  ) : (
    <SvgUri {...props} uri={source.uri} />
  );
}

function decodeSource(iconUri: string, color: string | undefined): IconSource {
  try {
    const xml = decodeInlineSvgDataUri(iconUri, color);

    return xml === null
      ? { kind: 'uri', uri: iconUri }
      : { kind: 'inline', xml };
  } catch (error) {
    console.error('Registry icon decoding failed', error);

    return { kind: 'unavailable' };
  }
}

function decodeInlineSvgDataUri(
  iconUri: string,
  color: string | undefined,
): string | null {
  const comma = iconUri.indexOf(',');
  const header = iconUri.slice(0, comma).split(';');

  if (header[0] !== 'data:image/svg+xml') return null;

  if (header.includes('base64')) return null;

  return withViewBox(
    withColor(decodeURIComponent(iconUri.slice(comma + 1)), color),
  );
}

const withColor = (xml: string, color: string | undefined): string =>
  color === undefined ? xml : xml.replaceAll(/currentColor/gi, color);

// An SVG with a width and height but no viewBox draws at its own size in the corner of the box; a viewBox scales it to fill the box, centred.
function withViewBox(xml: string): string {
  const [open] = /<svg\b[^>]*>/i.exec(xml) ?? [''];
  const viewBox = missingViewBox(open);

  return viewBox
    ? xml.replace(open, open.replace(/<svg\b/i, `<svg viewBox="${viewBox}"`))
    : xml;
}

function missingViewBox(open: string): string | undefined {
  if (/\bviewBox\s*=/i.test(open)) return undefined;

  const size = [
    numberAttribute(open, 'width'),
    numberAttribute(open, 'height'),
  ];

  return size.every(Boolean) ? `0 0 ${size.join(' ')}` : undefined;
}

function numberAttribute(open: string, name: string): string | undefined {
  return new RegExp(`\\b${name}\\s*=\\s*["']?([\\d.]+)`, 'i').exec(open)?.[1];
}

function UnavailableIcon({
  agentName,
  size,
}: Pick<RegistryIconProps, 'agentName' | 'size'>): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${agentName} icon unavailable`}
    >
      <Icon name="agent" size={size} />
    </View>
  );
}

const LoadedImage = Platform.OS === 'web' ? WebRegistryImage : RegistryImage;
