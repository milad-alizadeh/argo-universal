import type { AgentServer } from '@repo/contracts';
import { IconSlot } from '@repo/kit/primitives/content/icon';
import type { IconSizeValue } from '@repo/kit/symbols/icon-size';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';

interface AgentIconProps {
  agent?: AgentServer;
  size?: IconSizeValue;
}

type AgentSlotProps = Required<Pick<AgentIconProps, 'agent'>> &
  Pick<AgentIconProps, 'size'>;

const defaultSize: IconSizeValue = { compact: 'sm', wide: 'md' };

export function AgentIcon(props: AgentIconProps): React.JSX.Element | null {
  return props.agent ? (
    <AgentSlot agent={props.agent} size={props.size} />
  ) : null;
}

function AgentSlot(props: AgentSlotProps): React.JSX.Element {
  const size = props.size ?? defaultSize;

  return (
    <IconSlot size={size}>
      <AgentLogo
        logo={props.agent.icon ?? ''}
        label={props.agent.name}
        size={size}
        testID="composer-agent-icon"
      />
    </IconSlot>
  );
}
