import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { IconSlot } from '../../../../lib/generic/symbols/icon';
import type { IconRole } from '../../../../lib/generic/symbols/icon-role';

const ThemedLogo = withUniwind(SvgXml, {
  color: { fromClassName: 'className', styleProperty: 'color' },
});

interface AgentIconProps {
  agent?: AgentInfo;
  role?: IconRole;
}

export function AgentIcon({
  agent,
  role = 'control',
}: AgentIconProps): React.JSX.Element | null {
  return agent ? (
    <IconSlot role={role}>
      <AgentLogo agent={agent} />
    </IconSlot>
  ) : null;
}

function AgentLogo({ agent }: { agent: AgentInfo }): React.JSX.Element {
  return (
    <View testID="composer-agent-icon" className="h-full w-full">
      <ThemedLogo
        xml={agent.logo}
        className="text-foreground"
        width="100%"
        height="100%"
      />
    </View>
  );
}
