import type * as React from 'react';
import { action } from 'storybook/actions';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';

const onPress = action('open list item');

// The sidebar's flat rows, beside the grouped ones in the GroupedListItem story.
export function SidebarRows(): React.JSX.Element {
  return (
    <GroupedList variant="sidebar">
      <GroupedListSection title="Sidebar">
        <ProjectRow />
        <ConnectionRow />
        <AppearanceRow />
      </GroupedListSection>
    </GroupedList>
  );
}

function ProjectRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Projects"
      icon="folder"
      value="1"
      needsAttention
      onPress={onPress}
    />
  );
}

function ConnectionRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Connection"
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
    <GroupedListItem
      label="Appearance"
      icon="appearance"
      value="System"
      onPress={onPress}
    />
  );
}
