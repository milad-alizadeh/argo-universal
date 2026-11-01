import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

// While loading, or when what the page names is gone, the page is one row saying so.
export const oneRow = (title: string): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section>
      <FieldGroup.Value title={title} value="" />
    </FieldGroup.Section>
  </FieldGroup>
);
