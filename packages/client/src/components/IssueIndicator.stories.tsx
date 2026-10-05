import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { IssueIndicator } from './IssueIndicator';

const meta = {
  title: 'Shared/IssueIndicator',
  component: IssueIndicator,
  args: { number: 96 },
} satisfies Meta<typeof IssueIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const IssueNumber: Story = {
  name: 'Number',
  render: () => (
    <Variations>
      {[1, 96, 12345].map((number) => (
        <Variation key={number} label={`#${number}`}>
          <IssueIndicator number={number} />
        </Variation>
      ))}
    </Variations>
  ),
};
