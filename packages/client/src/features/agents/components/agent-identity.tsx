import type * as React from 'react';
import type { ReactElement } from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import { useWide } from '../../../lib/generic/use-wide/use-wide';

export interface AgentIdentityProps {
  logo: ReactElement;
  description: string;
}

// A wide window's first card on an Agent page, under a header that names the Agent alone; a phone opens on its centred summary instead.
// The status lives only in the Status section below it.
export function AgentIdentity(
  props: AgentIdentityProps,
): React.JSX.Element | null {
  if (!useWide()) return null;

  return (
    <FieldSection>
      <IdentityRow {...props} />
    </FieldSection>
  );
}

function IdentityRow(props: AgentIdentityProps): React.JSX.Element {
  return (
    <ListItem
      size="large"
      tone="muted"
      title={props.description}
      leading={props.logo}
    />
  );
}
