import type * as React from 'react';
import { useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Icon } from '#primitives/display/icon';
import {
  type IconRoleValue,
  useIconBox,
  useIconPixels,
} from '../../../../lib/generic/symbols/icon-role';
import { cssSafeUri } from './css-safe-uri';

interface RegistryIconProps {
  uri: string | undefined;
  agentName: string;
  role: IconRoleValue;
}

type IconSource =
  | { kind: 'inline'; xml: string }
  | { kind: 'uri'; uri: string }
  | { kind: 'unavailable' };

type ImageProps = Pick<
  XmlProps,
  'width' | 'height' | 'accessibilityRole' | 'accessibilityLabel'
>;

export function RegistryIcon({
  uri,
  agentName,
  role,
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon agentName={agentName} role={role} />;

  return <LoadedImage uri={uri} agentName={agentName} role={role} />;
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
        style={useIconBox(props.role)}
        onError={props.onError}
      />
    </View>
  );
}

function RegistryImage(props: LoadedIconProps): React.JSX.Element {
  const source = useRegistrySource(props.uri);
  const image = imageProps(props.agentName, useIconPixels(props.role));

  return renderIcon(source, image, <UnavailableIcon {...props} />);
}

// A vendored logo paints with currentColor, which would be black; it takes the foreground, so it reads on a dark surface.
function useRegistrySource(uri: string): IconSource {
  const resolved = useResolveClassNames('text-foreground').color;
  const color = typeof resolved === 'string' ? resolved : undefined;

  return useMemo(() => decodeRegistryIconSource(uri, color), [uri, color]);
}

function imageProps(agentName: string, pixels: number): ImageProps {
  return {
    width: pixels,
    height: pixels,
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

function decodeRegistryIconSource(
  iconUri: string,
  color: string | undefined,
): IconSource {
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
  role,
}: Pick<RegistryIconProps, 'agentName' | 'role'>): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${agentName} icon unavailable`}
    >
      <Icon name="agent" role={role} />
    </View>
  );
}

const LoadedImage = Platform.OS === 'web' ? WebRegistryImage : RegistryImage;
