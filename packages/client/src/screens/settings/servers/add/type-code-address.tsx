import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

export interface AddressFieldProps {
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
}

const footer =
  'Optional. Only if Argo can’t find the computer by itself. The other computer shows its address next to the code.';

/*
 * The optional Server address of the approved Enter code design (#1490, option B), a FieldGroup row as in Settings (ADR-0042). It is tried before the addresses the network announced, so a computer whose name is heard but whose address is not can still be reached.
 */
export function AddressField(props: AddressFieldProps): React.JSX.Element {
  return (
    <FieldGroup disabled={props.disabled}>
      <FieldGroup.Section footer={footer}>
        <FieldGroup.TextField
          title="Address"
          placeholder="studio-mac.local"
          keyboardType="url"
          value={props.value}
          onChangeText={props.onChangeText}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}
