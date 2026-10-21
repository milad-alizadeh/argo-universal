import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  commandNow,
  failedCommand,
  longOutputCommand,
  runningCommand,
} from '../tool-call.mocks';
import { CommandRow, type CommandRowProps } from './command-row';

const variations: (CommandRowProps & { label: string })[] = [
  { label: 'Running', row: runningCommand, now: commandNow },
  { label: 'Collapsed output', row: longOutputCommand },
  { label: 'Expanded output', row: longOutputCommand, initialOpen: true },
  { label: 'Failed command', row: failedCommand, initialOpen: true },
];

const meta = {
  title: 'Feed/CommandRow',
  component: CommandRow,
  args: { row: longOutputCommand },
} satisfies Meta<typeof CommandRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'CommandRow',
  render: () => (
    <Variations className="max-w-column!">
      {variations.map(({ label, ...props }) => (
        <Variation key={label} label={label}>
          <CommandRow {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
