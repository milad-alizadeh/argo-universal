import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { DiffView, type DiffViewProps } from './diff-view';

const editStatesId = 'edit-states';

const variations: (DiffViewProps & { label: string })[] = [
  { label: 'Small edit', file: recordedFile('agent-1') },
  {
    label: 'New file',
    file: recordedFile('agent-1', 'edit-and-command', 'add'),
  },
  {
    label: 'Deleted file',
    file: recordedFile('agent-2', editStatesId, 'delete'),
  },
  { label: 'Large diff', file: recordedFile('agent-2', editStatesId) },
  {
    label: 'Inline preview',
    file: recordedFile('agent-2', editStatesId),
    inline: true,
  },
];

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
      {variations.map(({ label, ...props }) => (
        <Variation key={label} label={label}>
          <DiffView {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
