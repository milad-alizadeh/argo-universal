import type * as React from 'react';
import { action } from 'storybook/actions';
import { FieldGroup } from '#primitives/fields/field-group/field-group-view';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import { ListItem } from '#primitives/lists/list-item/list-item-view';

const onPress = action('open list item');

// The sidebar's flat rows, beside the grouped ones in the ListItem story.
export function SidebarRows(): React.JSX.Element {
  return (
    <FieldGroup variant="navigation">
      <FieldSection title="Sidebar">
        <ProjectRow />
        <ConnectionRow />
        <AppearanceRow />
      </FieldSection>
    </FieldGroup>
  );
}

function ProjectRow(): React.JSX.Element {
  return (
    <ListItem
      title="Projects"
      icon="folder"
      value="1"
      needsAttention
      onPress={onPress}
    />
  );
}

function ConnectionRow(): React.JSX.Element {
  return (
    <ListItem
      title="Connection"
      icon="connection"
      value="This Mac"
      status={{ tone: 'success', label: 'connected' }}
      selected
      onPress={onPress}
    />
  );
}

function AppearanceRow(): React.JSX.Element {
  return (
    <ListItem
      title="Appearance"
      icon="appearance"
      value="System"
      onPress={onPress}
    />
  );
}
