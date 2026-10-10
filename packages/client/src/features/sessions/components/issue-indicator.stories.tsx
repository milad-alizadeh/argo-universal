import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../lib/generic/variations';
import { IssueIndicator } from './issue-indicator';

const meta = {
  title: 'Sessions/IssueIndicator',
  component: IssueIndicator,
  args: { number: 96 },
} satisfies Meta<typeof IssueIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'IssueIndicator',
  render: () => (
    <Variations>
      <Variation label="Short number">
        <IssueIndicator number={96} />
      </Variation>
      <Variation label="Long number">
        <IssueIndicator number={12345} />
      </Variation>
    </Variations>
  ),
};
