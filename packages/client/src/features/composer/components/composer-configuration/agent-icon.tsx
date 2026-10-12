import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import {
  iconSizeStyle,
  type IconSize,
} from '../../../../lib/generic/symbols/icon';

const ThemedLogo = withUniwind(SvgXml, {
  color: { fromClassName: 'className', styleProperty: 'color' },
});

export function AgentIcon({
  agent,
  size = 'sm',
}: {
  agent?: AgentInfo;
  size?: IconSize;
}): React.JSX.Element | null {
  return agent ? (
    <View
      style={iconSizeStyle(size)}
      className="shrink-0 items-center justify-center"
    >
      <View testID="composer-agent-icon" style={iconSizeStyle(size)}>
        <ThemedLogo
          xml={agent.logo}
          className="text-foreground"
          width="100%"
          height="100%"
        />
      </View>
    </View>
  ) : null;
}
