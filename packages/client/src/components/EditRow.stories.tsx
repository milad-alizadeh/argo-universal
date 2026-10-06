import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { recordedEdit } from '../../mocks/feed-edit-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { EditRow } from './EditRow';

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
      <Variation label="Small edit">
        <View testID="edit-small-edit">
          <EditRow row={recordedEdit('agent-1')} />
        </View>
      </Variation>
      <Variation label="New file">
        <View testID="edit-new-file">
          <EditRow row={recordedEdit('agent-1', 'edit-and-command', 'add')} />
        </View>
      </Variation>
      <Variation label="Multiple files">
        <EditRow row={recordedEdit('agent-2')} />
      </Variation>
      <Variation label="Large diff and deleted file">
        <View testID="edit-large-and-deleted">
          <EditRow row={recordedEdit('agent-2', 'edit-states')} />
        </View>
      </Variation>
      <Variation label="Failed edit">
        <View testID="edit-failed-edit">
          <EditRow row={recordedEdit('agent-2', 'edit-failure')} />
        </View>
      </Variation>
    </Variations>
  ),
};
