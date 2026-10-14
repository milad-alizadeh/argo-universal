import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';
import {
  CodeRows,
  LargeRows,
  PlainRows,
  StateRows,
} from './grouped-list-item-code-rows.mocks';
import { onPress } from './grouped-list-item-press.mocks';
import { SampleLogo } from './sample-logo.mocks';

export function GroupedRows(): React.JSX.Element {
  return (
    <GroupedList>
      <IconRows />
      <ImageRows />
      <DescriptionRows />
      <PlainRows />
      <CodeRows />
      <LargeRows />
      <StateRows />
      <ChoiceRows />
    </GroupedList>
  );
}

function IconRows(): React.JSX.Element {
  return (
    <GroupedListSection title="With icons">
      <ProjectsRow />
      <UnavailableAgentRow />
      <AppearanceRow />
    </GroupedListSection>
  );
}

function ProjectsRow(): React.JSX.Element {
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

function AppearanceRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Appearance"
      icon="appearance"
      value="System"
      status={{ tone: 'success', label: 'available' }}
      onPress={onPress}
    />
  );
}

function UnavailableAgentRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Agents"
      icon="agent"
      value="2"
      disabled
      status={{ tone: 'danger', label: 'unavailable' }}
      onPress={onPress}
    />
  );
}

function ImageRows(): React.JSX.Element {
  return (
    <GroupedListSection title="With an image">
      <GroupedListItem
        label="Example Agent"
        leading={<SampleLogo />}
        value="1.0"
        onPress={onPress}
      />
    </GroupedListSection>
  );
}

function DescriptionRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Description and status">
      <ClaudeAgentRow />
      <CodexRow />
      <GooseRow />
    </GroupedListSection>
  );
}

function ClaudeAgentRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Claude Agent"
      subtitle={{ text: 'ACP wrapper for Anthropic’s Claude' }}
      icon="agent"
      value="Ready"
      status={{ tone: 'success', label: 'Ready' }}
      onPress={onPress}
    />
  );
}

function CodexRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Codex"
      subtitle={{ text: 'ACP adapter for OpenAI’s coding assistant' }}
      icon="agent"
      value="Update available"
      status={{ tone: 'warning', label: 'Update available' }}
      onPress={onPress}
    />
  );
}

function GooseRow(): React.JSX.Element {
  return (
    <GroupedListItem
      label="goose"
      subtitle={{
        text: 'A local, extensible, open source AI agent that automates engineering tasks',
      }}
      icon="agent"
      value="Not installed"
      onPress={onPress}
    />
  );
}

// A choice list: the chosen row carries the SelectedCheck; a row that opens a page shows the DisclosureChevron.
function ChoiceRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Choices">
      <GroupedListItem
        label="Ask"
        selected
        disclosure={false}
        accessory={<SelectedCheck />}
        onPress={onPress}
      />
      <GroupedListItem label="Auto" disclosure={false} onPress={onPress} />
      <GroupedListItem label="More modes" onPress={onPress} />
    </GroupedListSection>
  );
}
