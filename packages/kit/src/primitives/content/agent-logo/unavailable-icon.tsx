import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import type { RegistryIconProps } from './registry-icon-props';

export function UnavailableIcon({
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
