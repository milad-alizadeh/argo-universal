import type * as React from 'react';
import { action } from 'storybook/actions';
import { FieldGroup } from '../src/lib/generic/primitives/fields/field-group/field-group';
import { FieldSection } from '../src/lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '../src/lib/generic/primitives/lists/list-item/list-item';

const onPress = action('open list item');

// The sidebar's flat rows, beside the grouped ones in the ListItem story.
export function SidebarRows(): React.JSX.Element {
  return (
    <FieldGroup variant="navigation">
      <FieldSection title="Sidebar">
        <ListItem
          title="Projects"
          icon="folder"
          value="1"
          needsAttention
          onPress={onPress}
        />
        <ListItem
          title="Connection"
          icon="connection"
          value="This Mac"
          status={{ tone: 'success', label: 'connected' }}
          selected
          onPress={onPress}
        />
        <ListItem
          title="Appearance"
          icon="appearance"
          value="System"
          onPress={onPress}
        />
      </FieldSection>
    </FieldGroup>
  );
}
