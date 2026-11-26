import type { OperationGrant } from '@repo/contracts/operations';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';
import { useState } from 'react';

const footer = {
  some: 'Sessions started in each Project run these Operations in the Project shown without asking. Revoke one to be asked again.',
  none: 'When you choose Always allow on a Permission request, Sessions started in that Project run the Operation without asking, and it is listed here to revoke.',
};

// Where the grant applies: from the Project the Sessions start in, into the Project the Operation acts in.
const reach = ({ projectName, targetProjectName }: OperationGrant): string =>
  projectName === targetProjectName
    ? projectName
    : `${projectName} → ${targetProjectName}`;

const revokeActions = (onRevoke: () => void): AlertAction[] => [
  { label: 'Cancel', role: 'cancel' },
  { label: 'Revoke', tone: 'danger', onPress: onRevoke },
];

// Asks first: once revoked, every Session in the Project asks again before running the Operation.
function RevokeAlert(props: {
  grant: OperationGrant | undefined;
  onClose: () => void;
  onRevoke: (grant: OperationGrant) => void;
}): React.JSX.Element {
  const { grant } = props;

  return (
    <Alert
      open={grant !== undefined}
      onOpenChange={(open) => (open ? undefined : props.onClose())}
      title="Revoke Always allow?"
      message={
        grant
          ? `Sessions started in ${grant.projectName} will ask again before running ${grant.label} in ${grant.targetProjectName}.`
          : ''
      }
      actions={revokeActions(() => (grant ? props.onRevoke(grant) : undefined))}
    />
  );
}

// The Operations the person chose Always allow for, each revoked only after the person confirms.
export function GrantsSection(props: {
  grants?: OperationGrant[];
  onRevokeGrant: (grant: OperationGrant) => void;
}): React.JSX.Element | null {
  const [asking, setAsking] = useState<OperationGrant>();
  const { grants } = props;

  if (!grants) return null;

  return (
    <>
      <FieldGroup.Section
        title="Always allowed"
        footer={grants.length > 0 ? footer.some : footer.none}
      >
        {grants.map((grant) => (
          <FieldGroup.Link
            key={`${grant.projectId}/${grant.operationId}/${grant.targetProjectId}`}
            title={grant.label}
            subtitle={reach(grant)}
            value="Revoke"
            action
            onPress={() => setAsking(grant)}
          />
        ))}
      </FieldGroup.Section>
      <RevokeAlert
        grant={asking}
        onClose={() => setAsking(undefined)}
        onRevoke={props.onRevokeGrant}
      />
    </>
  );
}
