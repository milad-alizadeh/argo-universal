import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  longPlanProposal,
  PlanProposalPreview,
  shortPlanProposal,
} from '../../mocks/plan-proposal-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { PlanProposalCard } from './plan-proposal-card';

const meta = {
  title: 'Sessions/PlanProposalCard',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: {
    proposal: shortPlanProposal,
    onAnswer: action('answer plan proposal'),
  },
} satisfies Meta<typeof PlanProposalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'PlanProposalCard',
  render: (args) => (
    <ScrollView className="flex-1 min-h-0" contentContainerClassName="py-4">
      <Variations className="max-w-none">
        <Variation label="Short Plan proposal">
          <View testID="proposal-preview-short" className="h-144">
            <PlanProposalPreview {...args} />
          </View>
        </Variation>
        <Variation label="Long Plan proposal">
          <View testID="proposal-preview-long" className="h-144">
            <PlanProposalPreview {...args} proposal={longPlanProposal} />
          </View>
        </Variation>
        <Variation label="Already answered">
          <View testID="proposal-preview-answered" className="h-144">
            <PlanProposalPreview {...args} answered />
          </View>
        </Variation>
      </Variations>
    </ScrollView>
  ),
};
