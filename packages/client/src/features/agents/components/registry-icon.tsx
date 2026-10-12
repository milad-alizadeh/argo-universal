import type * as React from 'react';
import { useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { Icon, iconPixels } from '../../../lib/generic/symbols/icon';

interface RegistryIconProps {
  uri: string | undefined;
  agentName: string;
}
interface LoadedIconProps {
  uri: string;
  agentName: string;
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
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon agentName={agentName} />;
  if (Platform.OS === 'web')
    return <WebRegistryImage uri={uri} agentName={agentName} />;
  return <RegistryImage uri={uri} agentName={agentName} />;
}

// The browser draws the SVG itself: react-native-svg's web build hands the file's attributes, such as data-name, to DOM elements as unknown props.
function WebRegistryImage({
  uri,
  agentName,
}: LoadedIconProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed) return <UnavailableIcon agentName={agentName} />;
  return (
    <Image
      accessibilityLabel={`${agentName} icon`}
      source={{ uri }}
      style={{ width: iconPixels('sm'), height: iconPixels('sm') }}
      onError={() => setFailed(true)}
    />
  );
}

function RegistryImage({ uri, agentName }: LoadedIconProps): React.JSX.Element {
  const source = useMemo(
    (): IconSource => decodeRegistryIconSource(uri),
    [uri],
  );
  return renderIcon(source, imageProps(agentName));
}

function imageProps(agentName: string): ImageProps {
  const pixels = iconPixels('sm');
  return {
    width: pixels,
    height: pixels,
    accessibilityRole: 'image',
    accessibilityLabel: `${agentName} icon`,
    fallback: <UnavailableIcon agentName={agentName} />,
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
  return decodeURIComponent(iconUri.slice(comma + 1));
}

function UnavailableIcon({
  agentName,
}: {
  agentName: string;
}): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${agentName} icon unavailable`}
    >
      <Icon name="agent" size="sm" />
    </View>
  );
}
