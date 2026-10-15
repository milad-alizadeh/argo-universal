import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListContent } from './grouped-list-content';

const meta = {
  title: 'Design System/Primitives/GroupedListContent',
  args: { children: null },
  component: GroupedListContent,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedListContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'GroupedListContent',
  render: () => (
    <GroupedList>
      <GroupedListContent>
        <SetupNotes />
      </GroupedListContent>
      <SaveSection />
    </GroupedList>
  ),
};

const setupNotes = [
  'Choose the program that starts this Agent. Argo launches the program in the selected Project, so relative paths resolve from that Project.',
  'Add each command-line argument separately. Keep the executable in the program field and put its options in the argument fields.',
  'Environment variables apply to this Agent only. Use them for configuration that the program expects when it starts a new Session.',
  'Check that the program is installed on the Server Device. Installing it on a paired phone does not make it available to the Server.',
  'After saving, start a new Session to use the updated configuration. Existing Sessions keep the program and arguments they started with.',
  'If the Agent cannot start, check the program path and arguments. The failure message in the Session can help identify a missing executable or an unsupported option.',
  'End of setup notes. The Save row follows this content.',
].join('\n\n');

function SetupNotes(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const toggle = {
    label: expanded ? 'Hide setup notes' : 'Show setup notes',
    fullWidth: 'narrow' as const,
    onPress: (): void => setExpanded(!expanded),
  };

  return (
    <View>
      <Button {...toggle} />
      {expanded && <Text>{setupNotes}</Text>}
    </View>
  );
}

function SaveSection(): React.JSX.Element {
  const [saves, setSaves] = useState(0);

  const row = {
    label: 'Save',
    value: saves ? `Saved revision ${saves}` : 'Not saved',
    onPress: (): void => setSaves(saves + 1),
  };

  return (
    <GroupedListSection title="Program">
      <GroupedListItem {...row} />
    </GroupedListSection>
  );
}
