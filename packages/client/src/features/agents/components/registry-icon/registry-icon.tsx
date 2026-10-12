import type * as React from 'react';
import { useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { Icon, type IconRole } from '../../../../lib/generic/symbols/icon';
import { useIconPixels } from '../../../../lib/generic/symbols/icon-role';

interface RegistryIconProps {
  uri: string | undefined;
  agentName: string;
  role: IconRole;
}
type IconSource =
  | { kind: 'inline'; xml: string }
  | { kind: 'uri'; uri: string }
  | { kind: 'unavailable' };
type ImageProps = Pick<
  XmlProps,
  'width' | 'height' | 'accessibilityRole' | 'accessibilityLabel'
> & {
  fallback: React.JSX.Element;
};

export function RegistryIcon({
  uri,
  agentName,
  role,
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon agentName={agentName} role={role} />;
  return <LoadedImage uri={uri} agentName={agentName} role={role} />;
}

type LoadedIconProps = Required<RegistryIconProps> & { uri: string };

// The browser draws the SVG itself: react-native-svg's web build hands the file's attributes, such as data-name, to DOM elements as unknown props.
function WebRegistryImage(props: LoadedIconProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const pixels = useIconPixels(props.role);
  if (failed) return <UnavailableIcon {...props} />;
  return (
    <Image
      accessibilityLabel={`${props.agentName} icon`}
      source={{ uri: props.uri }}
      style={{ width: pixels, height: pixels }}
      onError={() => setFailed(true)}
    />
  );
}

function RegistryImage({
  uri,
  agentName,
  role,
}: LoadedIconProps): React.JSX.Element {
  const source = useMemo(
    (): IconSource => decodeRegistryIconSource(uri),
    [uri],
  );
  const pixels = useIconPixels(role);
  return renderIcon(source, imageProps({ agentName, role, pixels }));
}

function imageProps({
  agentName,
  role,
  pixels,
}: Pick<RegistryIconProps, 'agentName' | 'role'> & {
  pixels: number;
}): ImageProps {
  return {
    width: pixels,
    height: pixels,
    accessibilityRole: 'image',
    accessibilityLabel: `${agentName} icon`,
    fallback: <UnavailableIcon agentName={agentName} role={role} />,
  };
}

function renderIcon(source: IconSource, props: ImageProps): React.JSX.Element {
  if (source.kind === 'unavailable') return props.fallback;
  return source.kind === 'inline' ? (
    <SvgXml {...props} xml={source.xml} />
  ) : (
    <SvgUri {...props} uri={source.uri} />
  );
}

function decodeRegistryIconSource(iconUri: string): IconSource {
  try {
    const xml = decodeInlineSvgDataUri(iconUri);
    return xml === null
      ? { kind: 'uri', uri: iconUri }
      : { kind: 'inline', xml };
  } catch (error) {
    console.error('Registry icon decoding failed', error);
    return { kind: 'unavailable' };
  }
}

function decodeInlineSvgDataUri(iconUri: string): string | null {
  const comma = iconUri.indexOf(',');
  const header = iconUri.slice(0, comma).split(';');
  if (header[0] !== 'data:image/svg+xml') return null;
  if (header.includes('base64')) return null;
  return withViewBox(decodeURIComponent(iconUri.slice(comma + 1)));
}

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
