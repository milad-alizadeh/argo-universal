import type { AgentServer } from '@repo/contracts';
import { IconSlot } from '@repo/kit/primitives/content/icon';
import type { IconRoleValue } from '@repo/kit/symbols/icon-role';
import { referenceShare } from '@repo/kit/symbols/symbol-path';
import type * as React from 'react';
import { View } from 'react-native';
import { AgentLogo } from '#features/agents';

interface AgentIconProps {
  agent?: AgentServer;
  role?: IconRoleValue;
}

// A logo fills the share of its box that the symbols beside it fill, as the kit's logos do; the Agent glyph is already a symbol.
const logoScale = { transform: [{ scale: referenceShare }] };

export function AgentIcon({
  agent,
  role = { compact: 'body', wide: 'row' },
}: AgentIconProps): React.JSX.Element | null {
  return agent ? (
    <IconSlot role={role}>
      <ScaledLogo agent={agent} role={role} />
    </IconSlot>
  ) : null;
}

function ScaledLogo(props: Required<AgentIconProps>): React.JSX.Element {
  return (
    <View
      className="h-full w-full"
      style={props.agent.icon ? logoScale : undefined}
    >
      <AgentLogo
        logo={props.agent.icon ?? ''}
        label={props.agent.name}
        role={props.role}
        testID="composer-agent-icon"
      />
    </View>
  );
}
