import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  longPlanProposal,
  planProposalMocks,
  PlanProposalPreview,
  shortPlanProposal,
} from '../../../../mocks/plan-proposal-mock';
import { Variation, Variations } from '../../../lib/generic/variations';
import { PlanProposalCard } from './plan-proposal-card';

type GalleryArgs = ComponentProps<typeof PlanProposalCard> & {
  agent: (typeof planProposalMocks)[number]['agent'];
  requestState: ComponentProps<typeof PlanProposalCard>['state']['kind'];
};

const meta = {
  title: 'Requests/PlanProposalCard',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: {
    proposal: shortPlanProposal,
    state: { kind: 'open' },
    agent: 'agent-2',
    requestState: 'open',
    onAnswer: action('answer plan proposal'),
  },
  argTypes: {
    agent: { options: ['agent-1', 'agent-2'], control: 'select' },
    requestState: {
      options: ['open', 'submitting', 'answered'],
      control: 'select',
    },
    proposal: { control: false },
    state: { control: false },
  },
} satisfies Meta<GalleryArgs>;
export default meta;
type Story = StoryObj<GalleryArgs>;

export const Overview: Story = {
  name: 'PlanProposalCard',
  render: (args) => (
    <ScrollView className="flex-1 min-h-0" contentContainerClassName="py-4">
      <Variations className="max-w-none">
        <Variation label="Short Plan proposal">
          <View testID="proposal-preview-short" className="h-144">
            <PlanProposalPreview
              {...args}
              proposal={
                planProposalMocks.find((mock) => mock.agent === args.agent)
                  ?.proposal ?? shortPlanProposal
              }
              state={
                args.requestState === 'answered'
                  ? {
                      kind: 'answered',
                      reason: 'Already answered on another device',
                    }
                  : { kind: args.requestState }
              }
            />
          </View>
        </Variation>
        <Variation label="Long Plan proposal">
          <View testID="proposal-preview-long" className="h-144">
            <PlanProposalPreview {...args} proposal={longPlanProposal} />
          </View>
        </Variation>
        <Variation label="Sending answer">
          <View className="h-144">
            <PlanProposalPreview {...args} state={{ kind: 'submitting' }} />
          </View>
        </Variation>
        <Variation label="Answer failed">
          <View className="h-144">
            <PlanProposalPreview
              {...args}
              state={{ kind: 'open' }}
              error="Could not send your answer. Try again."
            />
          </View>
        </Variation>
        <Variation label="Already answered">
          <View testID="proposal-preview-answered" className="h-144">
            <PlanProposalPreview
              {...args}
              state={{
                kind: 'answered',
                reason: 'Already answered on another device',
              }}
            />
          </View>
        </Variation>
      </Variations>
    </ScrollView>
  ),
};
