import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FieldRow } from '#lib/generic/primitives/fields/field-row/field-row';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';

// A destructive button with no card around it, in a row the native list sizes, and what removing does: small on wide windows, full width on a phone. The Server cannot remove a Project yet.
export function RemoveProject(): React.JSX.Element {
  return (
    <FieldRow>
      <View className="items-stretch gap-2 wide:items-start">
        <RemoveButton />
        <Text role="secondary" className="px-4 wide:px-0">
          Argo forgets this Project and archives its Sessions. The folder and
          its files stay.
        </Text>
      </View>
    </FieldRow>
  );
}

function RemoveButton(): React.JSX.Element {
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      variant="outline"
      role="destructive"
      label="Remove Project"
      disabled
    />
  );
}
