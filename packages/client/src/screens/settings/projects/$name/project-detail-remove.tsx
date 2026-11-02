import { productName } from '@repo/contracts/product-identity';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';

// The Server cannot remove a Project yet, so the row stays disabled.
export const removeSection = (): ReactElement => (
  <FieldGroup.Section
    footer={`${productName} forgets this Project and archives its Sessions. The folder and its files stay.`}
  >
    <FieldGroup.Link
      title="Remove Project"
      action
      destructive
      disabled
      onPress={ignorePress}
    />
  </FieldGroup.Section>
);

function ignorePress(): void {}
