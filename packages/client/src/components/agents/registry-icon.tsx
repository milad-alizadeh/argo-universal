import { RobotIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgUri, SvgXml, type XmlProps } from 'react-native-svg';
import { Icon, useIconPixels } from '../../lib/icon';

interface RegistryIconProps {
  uri: string | undefined;
  name: string;
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
  name,
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon name={name} />;
  return <RegistryImage uri={uri} name={name} />;
}

function RegistryImage({
  uri,
  name,
}: {
  uri: string;
  name: string;
}): React.JSX.Element {
  const source = useMemo((): IconSource => readIconSource(uri), [uri]);
  return renderIcon(source, useImageProps(name));
}

function useImageProps(name: string): ImageProps {
  const pixels = useIconPixels('lg');
  return {
    width: pixels,
    height: pixels,
    accessibilityRole: 'image',
    accessibilityLabel: `${name} icon`,
    fallback: <UnavailableIcon name={name} />,
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

function readIconSource(uri: string): IconSource {
  try {
    const xml = inlineSvg(uri);
    return xml === null ? { kind: 'uri', uri } : { kind: 'inline', xml };
  } catch (error) {
    console.error('Registry icon decoding failed', error);
    return { kind: 'unavailable' };
  }
}

function inlineSvg(uri: string): string | null {
  const comma = uri.indexOf(',');
  const header = uri.slice(0, comma).split(';');
  if (header[0] !== 'data:image/svg+xml') return null;
  if (header.includes('base64')) return null;
  return decodeURIComponent(uri.slice(comma + 1));
}

function UnavailableIcon({ name }: { name: string }): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name} icon unavailable`}
    >
      <Icon as={RobotIcon} size="lg" />
    </View>
  );
}
