import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Text } from '#primitives/display/text/text';
import { Textarea } from '#primitives/inputs/textarea/textarea';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { RequestHeading } from '../request-card/request-heading';
import type { PlanProposalCardProps } from './plan-proposal-card';
import type { PlanProposalInteraction } from './use-plan-proposal';

type BodyProps = PlanProposalCardProps & {
  interaction: PlanProposalInteraction;
};

export function PlanProposalBody(props: BodyProps): ReactNode {
  const wide = useWide();
  const { expanded } = props.interaction;
  return (
    <View
      className={cn(
        'gap-4 wide:gap-3',
        expanded ? 'flex-1 min-h-0' : 'px-4 pt-1 wide:p-0',
      )}
    >
      <ProposalHeading interaction={props.interaction} wide={wide} />
      <ProposalDocument {...props} wide={wide} />
      {props.interaction.planning && props.state.kind !== 'answered' && (
        <ProposalFeedback {...props} />
      )}
    </View>
  );
}

function ProposalHeading({
  interaction,
  wide,
}: {
  interaction: PlanProposalInteraction;
  wide: boolean;
}): ReactNode {
  return (
    <RequestHeading
      icon="checklist"
      title="Approve this plan?"
      hint="Approving leaves Plan mode and starts the work."
      trailing={
        wide && (
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
        )
      }
    />
  );
}

function ProposalFeedback({ state, interaction }: BodyProps): ReactNode {
  return (
    <View className={cn('gap-1.5 pt-1', interaction.expanded && 'px-4')}>
      <Text role="body">What should change in the plan?</Text>
      <Textarea
        autoFocus
        accessibilityLabel="What should change in the plan?"
        placeholder="Tell the Agent what to change"
        value={interaction.feedback}
        editable={state.kind === 'open'}
        onChangeText={interaction.setFeedback}
      />
      <Text role="secondary">Required. The Agent keeps planning with it.</Text>
    </View>
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
  const document = (
    <View className="rounded-xl android:rounded-2xl bg-secondary px-4 py-3.5">
      <PlanDocument content={props.proposal.content} layout="request-sheet" />
    </View>
  );
  if (!props.interaction.planning) return document;
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
