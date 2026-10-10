import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { Icon, useIconPixels } from '../../../lib/generic/symbols/icon';

interface RegistryIconProps {
  uri: string | undefined;
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
  return <RegistryImage uri={uri} agentName={agentName} />;
}

function RegistryImage({
  uri,
  agentName,
}: {
  uri: string;
  agentName: string;
}): React.JSX.Element {
  const source = useMemo(
    (): IconSource => decodeRegistryIconSource(uri),
    [uri],
  );
  return renderIcon(source, useImageProps(agentName));
}

function useImageProps(agentName: string): ImageProps {
  const pixels = useIconPixels();
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
      <Icon name="agent" />
    </View>
  );
}
