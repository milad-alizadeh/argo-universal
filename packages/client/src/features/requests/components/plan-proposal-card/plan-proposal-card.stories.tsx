const answeredElsewhere = 'Already answered on another device';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  longPlanProposal,
  planProposalMocks,
  PlanProposalPreview,
  shortPlanProposal,
} from '../../../../../mocks/plan-proposal-mock';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { PlanProposalCard } from './plan-proposal-card';

type GalleryArgs = ComponentProps<typeof PlanProposalCard> & {
  agent: (typeof planProposalMocks)[number]['agent'];
  planLength: 'short' | 'long';
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
    planLength: 'short',
    requestState: 'open',
    onAnswer: action('answer plan proposal'),
  },
  argTypes: {
    planLength: { options: ['short', 'long'], control: 'select' },
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
  render: function ProposalGallery(args): React.JSX.Element {
    if (!useWide())
      return (
        <PlanProposalPreview
          composer
          {...args}
          proposal={
            args.planLength === 'long'
              ? longPlanProposal
              : (planProposalMocks.find((mock) => mock.agent === args.agent)
                  ?.proposal ?? shortPlanProposal)
          }
          state={
            args.requestState === 'answered'
              ? {
                  kind: 'answered',
                  reason: answeredElsewhere,
                }
              : { kind: args.requestState }
          }
        />
      );
    return (
      <ScrollView className="flex-1 min-h-0" contentContainerClassName="py-4">
        <Variations className="max-w-none">
          <Variation label="Short Plan proposal">
            <View testID="proposal-preview-short" className="h-144">
              <PlanProposalPreview
                composer
                {...args}
                proposal={
                  planProposalMocks.find((mock) => mock.agent === args.agent)
                    ?.proposal ?? shortPlanProposal
                }
                state={
                  args.requestState === 'answered'
                    ? {
                        kind: 'answered',
                        reason: answeredElsewhere,
                      }
                    : { kind: args.requestState }
                }
              />
            </View>
          </Variation>
          <Variation label="Long Plan proposal">
            <View testID="proposal-preview-long" className="h-144">
              <PlanProposalPreview
                composer
                {...args}
                proposal={longPlanProposal}
              />
            </View>
          </Variation>
          <Variation label="Sending answer">
            <View className="h-144">
              <PlanProposalPreview
                composer
                {...args}
                state={{ kind: 'submitting' }}
              />
            </View>
          </Variation>
          <Variation label="Answer failed">
            <View className="h-144">
              <PlanProposalPreview
                composer
                {...args}
                state={{ kind: 'open' }}
                error="Could not send your answer. Try again."
              />
            </View>
          </Variation>
          <Variation label="Already answered">
            <View testID="proposal-preview-answered" className="h-144">
              <PlanProposalPreview
                composer
                {...args}
                state={{
                  kind: 'answered',
                  reason: answeredElsewhere,
                }}
              />
            </View>
          </Variation>
        </Variations>
      </ScrollView>
    );
  },
};
