import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { recordedFile } from '../../../mocks/feed-edit-mock';
import { Variation, Variations } from '../../../storybook/variations';
import { DiffView } from './diff-view';

const editStatesId = 'edit-states';

const meta = {
  title: 'Feed/DiffView',
  component: DiffView,
  args: { file: recordedFile('agent-1') },
} satisfies Meta<typeof DiffView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {
  name: 'DiffView',
  render: () => (
    <Variations>
      <Variation label="Small edit">
        <DiffView file={recordedFile('agent-1')} />
      </Variation>
      <Variation label="New file">
        <DiffView file={recordedFile('agent-1', 'edit-and-command', 'add')} />
      </Variation>
      <Variation label="Deleted file">
        <DiffView file={recordedFile('agent-2', editStatesId, 'delete')} />
      </Variation>
      <Variation label="Large diff">
        <DiffView file={recordedFile('agent-2', editStatesId)} />
      </Variation>
      <Variation label="Inline preview">
        <DiffView file={recordedFile('agent-2', editStatesId)} inline />
      </Variation>
    </Variations>
  ),
};
