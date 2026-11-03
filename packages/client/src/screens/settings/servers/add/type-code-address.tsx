import { productName } from '@repo/contracts/product-identity';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

export interface AddressFieldProps {
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
}

const footer = `Optional. Only if ${productName} can’t find the computer by itself. The other computer shows its address next to the code, as address:port.`;

/*
 * The optional Server address of the approved Enter code design (#1490, option B), a FieldGroup row as in Settings (ADR-0042). With a port, it is the only place Argo knocks and nothing is listened for, so a computer the network never announces can still be reached; a bare name is tried before the addresses the network announced.
 */
export function AddressField(props: AddressFieldProps): React.JSX.Element {
  return (
    <FieldGroup disabled={props.disabled}>
      <FieldGroup.Section footer={footer}>
        <FieldGroup.TextField
          title="Address"
          placeholder="studio-mac.local:4000"
          keyboardType="url"
          value={props.value}
          onChangeText={props.onChangeText}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}
