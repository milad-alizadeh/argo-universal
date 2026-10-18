import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListContent } from './grouped-list-content';

const meta = {
  title: 'Design System/Primitives/Lists/GroupedListContent',
  args: { children: null },
  component: GroupedListContent,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedListContent>;

export default meta;

type Story = StoryObj<typeof meta>;

const details =
  'The Agent starts in the Project folder with the arguments and environment below. The program is checked when you save, and a failure shows here before the Agent is added. Arguments are passed in order, and environment variables are added to the ones the Server already has.';

const program = [
  ['Name', 'Example ACP'],
  ['Command', 'example-acp'],
  ['Arguments', '--acp --verbose'],
  ['Working folder', 'Project folder'],
  ['Version', '1.4.2'],
  ['Registry', 'Custom'],
  ['Installed', 'Yesterday'],
  ['Updates', 'Manual'],
] as const;

const environment = [
  ['ACP_LOG', 'debug'],
  ['ACP_HOME', '~/.example'],
  ['NODE_OPTIONS', '--max-old-space-size=4096'],
  ['PATH', 'Server default'],
] as const;

type Rows = readonly (readonly [string, string])[];

function Section(props: { title: string; rows: Rows }): React.JSX.Element {
  return (
    <GroupedListSection title={props.title}>
      {props.rows.map(([label, value]) => (
        <GroupedListItem key={label} label={label} value={value} />
      ))}
    </GroupedListSection>
  );
}

function Details({ expanded }: { expanded: boolean }): React.JSX.Element {
  return (
    <Text role="secondary">{expanded ? details : 'Checks run on save.'}</Text>
  );
}

// Show more grows the hosted content past the screen; the rows and Save after it stay reachable by scrolling.
function GrowingContent(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <GroupedListContent>
      <View className="gap-3">
        <Details expanded={expanded} />
        <Button
          fullWidth="narrow"
          label={expanded ? 'Show less' : 'Show more'}
          onPress={() => setExpanded(!expanded)}
        />
      </View>
    </GroupedListContent>
  );
}

export const Variations: Story = {
  render: () => (
    <GroupedList>
      <GrowingContent />
      <Section title="Program" rows={program} />
      <Section title="Environment" rows={environment} />
      <GroupedListContent title="Checks">
        <Text>The program is checked when you save.</Text>
      </GroupedListContent>
      <GroupedListContent>
        <Button fullWidth="narrow" label="Save" onPress={action('save')} />
      </GroupedListContent>
    </GroupedList>
  ),
};
