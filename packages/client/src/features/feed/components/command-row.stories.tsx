import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  commandNow,
  failedCommand,
  longOutputCommand,
  runningCommand,
} from '../../../mocks/tool-call-mock';
import { Variation, Variations } from '../../../storybook/variations';
import { CommandRow } from './command-row';

const meta = {
  title: 'Sessions/Feed/CommandRow',
  component: CommandRow,
  args: { row: longOutputCommand },
} satisfies Meta<typeof CommandRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'CommandRow',
  render: () => (
    <Variations className="max-w-composer!">
      <Variation label="Running">
        <CommandRow row={runningCommand} now={commandNow} />
      </Variation>
      <Variation label="Collapsed output">
        <CommandRow row={longOutputCommand} />
      </Variation>
      <Variation label="Expanded output">
        <CommandRow row={longOutputCommand} initialOpen />
      </Variation>
      <Variation label="Failed command">
        <CommandRow row={failedCommand} initialOpen />
      </Variation>
    </Variations>
  ),
};
