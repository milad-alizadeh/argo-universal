import type { ToolCallUpdate } from '@repo/contracts';
import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { recordedEdit } from '../../../../../mocks/feed-edit-mock';
import { EditRow } from './edit-row';

interface EditVariation {
  label: string;
  row: ToolCallUpdate;
  testID?: string;
}

const variations: EditVariation[] = [
  {
    label: 'Small edit',
    row: recordedEdit('agent-1'),
    testID: 'edit-small-edit',
  },
  {
    label: 'New file',
    row: recordedEdit('agent-1', 'edit-and-command', 'add'),
    testID: 'edit-new-file',
  },
  { label: 'Multiple files', row: recordedEdit('agent-2') },
  {
    label: 'Large diff and deleted file',
    row: recordedEdit('agent-2', 'edit-states'),
    testID: 'edit-large-and-deleted',
  },
  {
    label: 'Failed edit',
    row: recordedEdit('agent-2', 'edit-failure'),
    testID: 'edit-failed-edit',
  },
];

function EditVariationRow({ row, testID }: EditVariation): React.JSX.Element {
  if (!testID) return <EditRow row={row} />;

  return (
    <View testID={testID}>
      <EditRow row={row} />
    </View>
  );
}

const meta = {
  title: 'Feed/EditRow',
  component: EditRow,
  args: { row: recordedEdit('agent-1') },
  argTypes: { row: { control: false } },
} satisfies Meta<typeof EditRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'EditRow',
  render: () => (
    <Variations className="max-w-full">
      {variations.map((variation) => (
        <Variation key={variation.label} label={variation.label}>
          <EditVariationRow {...variation} />
        </Variation>
      ))}
    </Variations>
  ),
};
