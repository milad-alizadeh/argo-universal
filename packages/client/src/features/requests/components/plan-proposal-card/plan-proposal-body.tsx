import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import { Textarea } from '#primitives/inputs/textarea';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { RequestHeading } from '../request-card/request-heading';
import { useFocusOnMount } from '../use-focus-on-mount';
import type { PlanProposalCardProps } from './plan-proposal-card';
import type { PlanProposalInteraction } from './use-plan-proposal';

interface InteractionProps {
  interaction: PlanProposalInteraction;
}

type BodyProps = PlanProposalCardProps & InteractionProps;

const feedbackQuestion = 'What should change in the plan?';

// The card's heading and, on a phone, its sheet's title.
export const approvePlanQuestion = 'Approve this plan?';

export function PlanProposalBody(props: BodyProps): ReactNode {
  return (
    <View className={cn('gap-4 wide:gap-3', bodyLayout(props.interaction))}>
      <ProposalHeading interaction={props.interaction} />
      <ProposalDocument {...props} />
      {asksFeedback(props) && <ProposalFeedback {...props} />}
    </View>
  );
}

function bodyLayout({ expanded }: PlanProposalInteraction): string {
  return expanded ? 'flex-1 min-h-0' : 'px-4 pt-1 wide:p-0';
}

function asksFeedback({ interaction, state }: BodyProps): boolean {
  return interaction.planning && state.kind !== 'answered';
}

// Only a wide window expands the plan over the Feed.
function ProposalHeading({ interaction }: InteractionProps): ReactNode {
  return (
    <RequestHeading
      icon="checklist"
      title={approvePlanQuestion}
      hint="Approving leaves Plan mode and starts the work."
      trailing={
        <SizeClass only="wide">
          <ExpansionToggle interaction={interaction} />
        </SizeClass>
      }
    />
  );
}

function ExpansionToggle({ interaction }: InteractionProps): ReactNode {
  return (
    <IconButton
      variant="ghost"
      accessibilityLabel={
        interaction.expanded ? 'Collapse plan' : 'Expand plan'
      }
      onPress={() => interaction.setExpanded(!interaction.expanded)}
      icon={interaction.expanded ? 'collapse' : 'expand'}
      iconClassName="text-muted-foreground"
      size="sm"
    />
  );
}

function ProposalFeedback(props: BodyProps): ReactNode {
  return (
    <View className={cn('gap-1.5 pt-1', props.interaction.expanded && 'px-4')}>
      <Text role="body">{feedbackQuestion}</Text>
      <FeedbackField {...props} />
      <Text role="secondary">Required. The Agent keeps planning with it.</Text>
    </View>
  );
}

function FeedbackField({ state, interaction }: BodyProps): ReactNode {
  const field = useFocusOnMount();

  return (
    <Textarea
      ref={field}
      accessibilityLabel={feedbackQuestion}
      placeholder="Tell the Agent what to change"
      value={interaction.feedback}
      disabled={state.kind !== 'open'}
      onChangeText={interaction.setFeedback}
    />
  );
}

function ProposalDocument(props: BodyProps): ReactNode {
  return (
    <>
      <SizeClass only="wide">
        <PlanDocument
          content={props.proposal.content}
          layout={props.interaction.expanded ? 'expanded' : 'proposal'}
        />
      </SizeClass>
      <SizeClass only="compact">
        <SheetDocument {...props} />
      </SizeClass>
    </>
  );
}

function SheetDocument({ proposal, interaction }: BodyProps): ReactNode {
  const document = <SheetCard content={proposal.content} />;

  if (!interaction.planning) return document;

  return (
    <ScrollView
      className="max-h-20 grow-0"
      accessibilityLabel="Plan preview"
      role="region"
    >
      {document}
    </ScrollView>
  );
}

function SheetCard({ content }: { content: string }): ReactNode {
  return (
    <View className="rounded-xl android:rounded-2xl bg-muted px-4 py-3.5">
      <PlanDocument content={content} layout="request-sheet" />
    </View>
  );
}
