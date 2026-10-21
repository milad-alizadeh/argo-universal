import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ChangeStage, type ChangeStageProps } from './change-stage';

const meta = {
  title: 'Sessions/ChangeStage',
  component: ChangeStage,
  args: { stage: 'open' },
} satisfies Meta<typeof ChangeStage>;

export default meta;

type Story = StoryObj<typeof meta>;

const variations: ChangeStageProps[] = [
  { stage: 'working' },
  { stage: 'branch' },
  { stage: 'open' },
  { stage: 'merged' },
  { stage: 'closed' },
  { stage: 'open', modifier: 'draft' },
  { stage: 'open', modifier: 'conflict' },
];

export const Overview: Story = {
  name: 'ChangeStage',
  render: () => (
    <Variations>
      {variations.map((props) => (
        <Variation
          key={`${props.stage}-${props.modifier ?? ''}`}
          label={props.modifier ?? props.stage}
        >
          <ChangeStage {...props} />
          <ChangeStage {...props} form="disc" />
        </Variation>
      ))}
    </Variations>
  ),
};
