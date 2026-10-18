import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';

/*
 * A destructive button with no card around it, in a row the native list sizes, and what removing
 * does: small on wide windows, full width on a phone. On a wide web window the button's label and
 * the text under it start on the rows' margin M (20), as a section footer does; the button's own
 * padding is 12, so it sits 8 in. The Server cannot remove a Project yet.
 */
export function RemoveProject(): React.JSX.Element {
  return (
    <GroupedListContent>
      <View className="items-stretch gap-2 wide:items-start">
        <View className="web:wide:pl-2">
          <RemoveButton />
        </View>
        <Text role="secondary" className="px-4 native:wide:px-0 web:wide:px-5">
          Argo forgets this Project and archives its Sessions. The folder and
          its files stay.
        </Text>
      </View>
    </GroupedListContent>
  );
}

function RemoveButton(): React.JSX.Element {
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      variant="outline"
      tone="danger"
      label="Remove Project"
      disabled
    />
  );
}
