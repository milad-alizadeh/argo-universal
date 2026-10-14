import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import { Textarea } from '#primitives/inputs/textarea';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { RequestHeading } from '../request-card/request-heading';
import { useFocusOnMount } from '../use-focus-on-mount';
import type { PlanProposalCardProps } from './plan-proposal-card';
import type { PlanProposalInteraction } from './use-plan-proposal';

interface InteractionProps {
  interaction: PlanProposalInteraction;
}

type BodyProps = PlanProposalCardProps & InteractionProps;

const feedbackQuestion = 'What should change in the plan?';

export function PlanProposalBody(props: BodyProps): ReactNode {
  const wide = useWide();

  return (
    <View className={cn('gap-4 wide:gap-3', bodyLayout(props.interaction))}>
      <ProposalHeading interaction={props.interaction} wide={wide} />
      <ProposalDocument {...props} wide={wide} />
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

function ProposalHeading({
  interaction,
  wide,
}: InteractionProps & { wide: boolean }): ReactNode {
  return (
    <RequestHeading
      icon="checklist"
      title="Approve this plan?"
      hint="Approving leaves Plan mode and starts the work."
      trailing={wide && <ExpansionToggle interaction={interaction} />}
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
      size="md"
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

function ProposalDocument(props: BodyProps & { wide: boolean }): ReactNode {
  if (props.wide)
    return (
      <PlanDocument
        content={props.proposal.content}
        layout={props.interaction.expanded ? 'expanded' : 'proposal'}
      />
    );

  return <SheetDocument {...props} />;
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
