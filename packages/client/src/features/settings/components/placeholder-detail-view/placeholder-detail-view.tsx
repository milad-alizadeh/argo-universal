import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';

export interface PlaceholderDetailViewProps {
  title: string;
  // What will appear here once the App can show it.
  description: string;
}

// A Settings page whose content the App cannot show yet: its title, and a note where its rows will go.
export function PlaceholderDetailView({
  title,
  description,
}: PlaceholderDetailViewProps): React.JSX.Element {
  return (
    <Screen title={title}>
      <FieldGroup>
        <FieldGroup.Section>
          <FieldGroup.Value title={description} value="" />
        </FieldGroup.Section>
      </FieldGroup>
    </Screen>
  );
}
