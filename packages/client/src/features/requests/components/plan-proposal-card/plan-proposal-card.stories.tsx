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

const answeredElsewhere = 'Already answered on another device';

type CardProps = ComponentProps<typeof PlanProposalCard>;

interface GalleryVariation {
  label: string;
  testID?: string;
  props: (args: GalleryArgs) => Partial<CardProps>;
}

const galleryVariations: GalleryVariation[] = [
  {
    label: 'Short Plan proposal',
    testID: 'proposal-preview-short',
    props: (args) => ({
      proposal: agentProposal(args.agent),
      state: requestState(args.requestState),
    }),
  },
  {
    label: 'Long Plan proposal',
    testID: 'proposal-preview-long',
    props: () => ({ proposal: longPlanProposal }),
  },
  { label: 'Sending answer', props: () => ({ state: { kind: 'submitting' } }) },
  {
    label: 'Answer failed',
    props: () => ({
      state: { kind: 'open' },
      error: 'Could not send your answer. Try again.',
    }),
  },
  {
    label: 'Already answered',
    testID: 'proposal-preview-answered',
    props: () => ({ state: requestState('answered') }),
  },
];

export const Overview: Story = {
  name: 'PlanProposalCard',
  render: function ProposalGallery(args): React.JSX.Element {
    return useWide() ? <WideGallery {...args} /> : <PhoneGallery {...args} />;
  },
};

function PhoneGallery(args: GalleryArgs): React.JSX.Element {
  return (
    <PlanProposalPreview
      composer
      {...args}
      proposal={
        args.planLength === 'long'
          ? longPlanProposal
          : agentProposal(args.agent)
      }
      state={requestState(args.requestState)}
    />
  );
}

function WideGallery(args: GalleryArgs): React.JSX.Element {
  return (
    <ScrollView className="flex-1 min-h-0" contentContainerClassName="py-4">
      <Variations className="max-w-none">
        {galleryVariations.map((variation) => (
          <GalleryEntry key={variation.label} args={args} {...variation} />
        ))}
      </Variations>
    </ScrollView>
  );
}

function GalleryEntry({
  args,
  label,
  testID,
  props,
}: GalleryVariation & { args: GalleryArgs }): React.JSX.Element {
  return (
    <Variation label={label}>
      <View testID={testID} className="h-144">
        <PlanProposalPreview composer {...args} {...props(args)} />
      </View>
    </Variation>
  );
}

function agentProposal(agent: GalleryArgs['agent']): CardProps['proposal'] {
  return (
    planProposalMocks.find((mock) => mock.agent === agent)?.proposal ??
    shortPlanProposal
  );
}

function requestState(kind: GalleryArgs['requestState']): CardProps['state'] {
  return kind === 'answered'
    ? { kind: 'answered', reason: answeredElsewhere }
    : { kind };
}
