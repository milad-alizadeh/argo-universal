import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { Icon, IconSlot } from '../../../../lib/generic/symbols/icon';
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
      <AgentLogo agent={agent} role={role} />
    </IconSlot>
  ) : null;
}
interface AgentLogoProps {
  agent: AgentInfo;
  role: IconRole;
}

// An Agent with no logo, such as a custom one, shows the Agent glyph; an empty SVG would throw.
function AgentLogo({ agent, role }: AgentLogoProps): React.JSX.Element {
  if (!agent.logo.trim())
    return <Icon name="agent" role={role} className="text-foreground" />;
  return <AgentSvg logo={agent.logo} />;
}

function AgentSvg({ logo }: { logo: string }): React.JSX.Element {
  return (
    <View testID="composer-agent-icon" className="h-full w-full">
      <ThemedLogo
        xml={logo}
        className="text-foreground"
        width="100%"
        height="100%"
      />
    </View>
  );
}
