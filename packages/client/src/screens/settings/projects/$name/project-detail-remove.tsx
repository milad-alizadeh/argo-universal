import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';

// The Server cannot remove a Project yet, so the Button stays disabled.
export const removeSection = (): ReactElement => (
  <FieldGroup.Section footer="Argo forgets this Project and archives its Sessions. The folder and its files stay.">
    <Button
      label="Remove Project"
      variant="danger"
      disabled
      onPress={ignorePress}
    />
  </FieldGroup.Section>
);

function ignorePress(): void {}
