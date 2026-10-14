import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from './list-item';
import {
  CodeRows,
  LargeRows,
  PlainRows,
  StateRows,
} from './list-item-code-rows.mocks';
import { onPress } from './list-item-press.mocks';
import { SampleLogo } from './sample-logo.mocks';

export function GroupedRows(): React.JSX.Element {
  return (
    <FieldGroup>
      <IconRows />
      <ImageRows />
      <DescriptionRows />
      <PlainRows />
      <CodeRows />
      <LargeRows />
      <StateRows />
      <ChoiceRows />
    </FieldGroup>
  );
}

function IconRows(): React.JSX.Element {
  return (
    <FieldSection title="With icons">
      <ProjectsRow />
      <UnavailableAgentRow />
      <AppearanceRow />
    </FieldSection>
  );
}

function ProjectsRow(): React.JSX.Element {
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

function AppearanceRow(): React.JSX.Element {
  return (
    <ListItem
      title="Appearance"
      icon="appearance"
      value="System"
      status={{ tone: 'success', label: 'available' }}
      onPress={onPress}
    />
  );
}

function UnavailableAgentRow(): React.JSX.Element {
  return (
    <ListItem
      title="Agents"
      icon="agent"
      value="2"
      disabled
      status={{ tone: 'destructive', label: 'unavailable' }}
      onPress={onPress}
    />
  );
}

function ImageRows(): React.JSX.Element {
  return (
    <FieldSection title="With an image">
      <ListItem
        title="Example Agent"
        leading={<SampleLogo />}
        value="1.0"
        onPress={onPress}
      />
    </FieldSection>
  );
}

function DescriptionRows(): React.JSX.Element {
  return (
    <FieldSection title="Description and status">
      <ClaudeAgentRow />
      <CodexRow />
      <GooseRow />
    </FieldSection>
  );
}

function ClaudeAgentRow(): React.JSX.Element {
  return (
    <ListItem
      title="Claude Agent"
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
    <ListItem
      title="Codex"
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
    <ListItem
      title="goose"
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
    <FieldSection title="Choices">
      <ListItem
        title="Ask"
        selected
        disclosure={false}
        accessory={<SelectedCheck />}
        onPress={onPress}
      />
      <ListItem title="Auto" disclosure={false} onPress={onPress} />
      <ListItem title="More modes" onPress={onPress} />
    </FieldSection>
  );
}
