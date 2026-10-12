import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { SidebarRows } from '../../../../mocks/list-item-mock';
import { SampleLogo } from '../../../../mocks/sample-logo';
import { Icon } from '../symbols/icon';
import { Badge } from './badge';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';
import { Text } from './text';

const onPress = action('open list item');
const meta = {
  title: 'Design System/Primitives/ListItem',
  args: { title: 'Name' },
  component: ListItem,
  parameters: { screenPreview: true },
} satisfies Meta<typeof ListItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <View className="flex-1 wide:flex-row">
      {/* Each group scrolls on a phone, so the three sidebar rows keep only their own height. */}
      <View className="flex-1">
        <GroupedRows />
      </View>
      <View className="h-60 wide:h-auto wide:flex-1">
        <SidebarRows />
      </View>
    </View>
  ),
};

function GroupedRows(): React.JSX.Element {
  return (
    <FieldGroup>
      <FieldSection title="With icons">
        <ListItem
          title="Projects"
          icon="folder"
          value="1"
          needsAttention
          onPress={onPress}
        />
        <ListItem
          title="Agents"
          icon="agent"
          value="2"
          disabled
          status={{ tone: 'destructive', label: 'unavailable' }}
          onPress={onPress}
        />
        <ListItem
          title="Appearance"
          icon="appearance"
          value="System"
          status={{ tone: 'success', label: 'available' }}
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection title="With an image">
        <ListItem
          title="Example Agent"
          leading={<SampleLogo />}
          value="1.0"
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection title="Description and status">
        <ListItem
          title="Claude Agent"
          subtitle={{ text: 'ACP wrapper for Anthropic’s Claude' }}
          icon="agent"
          value="Ready"
          status={{ tone: 'success', label: 'Ready' }}
          onPress={onPress}
        />
        <ListItem
          title="Codex"
          subtitle={{ text: 'ACP adapter for OpenAI’s coding assistant' }}
          icon="agent"
          value="Update available"
          status={{ tone: 'warning', label: 'Update available' }}
          onPress={onPress}
        />
        <ListItem
          title="goose"
          subtitle={{
            text: 'A local, extensible, open source AI agent that automates engineering tasks',
          }}
          icon="agent"
          value="Not installed"
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection title="Without icons">
        <ListItem title="Name" value="Argo" onPress={onPress} />
        <ListItem title="Version" value="1.0" />
      </FieldSection>
      <FieldSection title="Code and actions">
        <ListItem code title="--experimental-acp" onPress={onPress} />
        <ListItem
          code
          title="EXAMPLE_HOME"
          subtitle={{ text: '/Users/example/.example', code: true }}
          onPress={onPress}
        />
        <ListItem
          icon="add"
          tone="accent"
          title="Add argument"
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection title="Large, with a muted description">
        <ListItem
          size="large"
          tone="muted"
          title="ACP wrapper for Anthropic’s Claude"
          leading={<Icon name="agent" size="lg" className="text-foreground" />}
          accessory={
            <Badge tone="success">
              <Text>Ready</Text>
            </Badge>
          }
        />
      </FieldSection>
      <FieldSection title="Loading and failure">
        <ListItem title="Connecting to the Server…" loading />
        <ListItem title="Couldn't reach the Server." tone="destructive" />
      </FieldSection>
    </FieldGroup>
  );
}
