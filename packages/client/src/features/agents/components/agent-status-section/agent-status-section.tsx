import type * as React from 'react';
import type { ReactElement } from 'react';
import { Button } from '#lib/generic/primitives/buttons/button/button';
import { FieldRow } from '#lib/generic/primitives/fields/field-row/field-row';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import type { StatusTone } from '../../state/agent-status';

export interface StatusSectionProps {
  // The status itself, such as "Can’t start".
  label: string;
  // The trailing dot, or a spinner while pending; none for a status such as Not installed.
  tone?: StatusTone;
  // The observed reason, or what the status means.
  footer?: string;
  // The footer reads as a failure, such as Can't start's reason.
  failure?: boolean;
  // The one call to action under the footer, such as Recheck.
  action?: ReactElement | null;
}

// Where an Agent stands: one row naming the status with its dot, the reason in the section's footer, then its call to action.
export function StatusSection(props: StatusSectionProps): React.JSX.Element {
  return (
    <>
      <FieldSection
        title="Status"
        footer={props.footer}
        footerTone={props.failure ? 'destructive' : undefined}
      >
        <ListItem
          title={props.label}
          status={props.tone ? { tone: props.tone, label: '' } : undefined}
        />
      </FieldSection>
      <StatusActionRow action={props.action} />
    </>
  );
}

function StatusActionRow({
  action,
}: Pick<StatusSectionProps, 'action'>): React.JSX.Element | null {
  return action ? <FieldRow>{action}</FieldRow> : null;
}

// The section's call to action: primary, full width on a phone; without a handler the page cannot act yet.
export function StatusButton(props: {
  label: string;
  onPress?: () => void;
  busy?: boolean;
}): React.JSX.Element {
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      label={props.label}
      onPress={props.onPress}
      disabled={!props.onPress || props.busy}
      loading={props.busy}
    />
  );
}
