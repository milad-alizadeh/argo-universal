import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Progress } from './progress';

function ValueExamples() {
  return (
    <Variations>
      {[0, 25, 50, 75, 100].map((value) => (
        <Variation key={value} label={`${value}%`}>
          <Progress value={value} />
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Progress',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: ValueExamples };
