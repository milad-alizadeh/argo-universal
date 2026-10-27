import type * as React from 'react';
import { useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { useIconBox } from '../../../symbols/icon-size';
import { cssSafeUri } from './css-safe-uri';
import { RegistryImage } from './native-registry-image';
import type { LoadedIconProps, RegistryIconProps } from './registry-icon-props';
import { UnavailableIcon } from './unavailable-icon';

export type { RegistryIconProps } from './registry-icon-props';

export function RegistryIcon({
  uri,
  agentName,
  size,
}: RegistryIconProps): React.JSX.Element {
  if (!uri) return <UnavailableIcon agentName={agentName} size={size} />;

  return <LoadedImage uri={uri} agentName={agentName} size={size} />;
}

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

const LoadedImage = Platform.OS === 'web' ? WebRegistryImage : RegistryImage;
