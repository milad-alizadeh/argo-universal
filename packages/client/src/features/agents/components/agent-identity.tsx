import type * as React from 'react';
import type { ReactElement } from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../lib/generic/use-wide/use-wide';

export interface AgentIdentityProps {
  logo: ReactElement;
  description: string;
  // The status chip, or Install for a registry Agent.
  trailing: ReactElement;
}

// A wide window's first card on an Agent page, under a header that names the Agent alone; a phone opens on its centred summary instead.
export function AgentIdentity(
  props: AgentIdentityProps,
): React.JSX.Element | null {
  if (!useWide()) return null;

  return (
    <GroupedListSection>
      <IdentityRow {...props} />
    </GroupedListSection>
  );
}

function IdentityRow(props: AgentIdentityProps): React.JSX.Element {
  return (
    <GroupedListItem
      size="large"
      tone="muted"
      title={props.description}
      leading={props.logo}
      accessory={props.trailing}
    />
  );
}
