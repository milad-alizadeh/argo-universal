import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import { Textarea } from '#primitives/inputs/textarea/textarea';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
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
      className={cn('gap-2', expanded ? 'flex-1 min-h-0' : 'px-4 pt-4 pb-1')}
    >
      {wide && <ProposalHeading interaction={props.interaction} />}
      <ProposalDocument {...props} wide={wide} />
      {props.interaction.planning && props.state.kind !== 'answered' && (
        <ProposalFeedback {...props} />
      )}
    </View>
  );
}

function ProposalHeading({
  interaction,
}: {
  interaction: PlanProposalInteraction;
}): ReactNode {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5',
        interaction.expanded && 'px-4 pt-4 pb-2',
      )}
    >
      <Icon role="body" name="plan-mode" className="text-muted-foreground" />
      <Text role={'heading'} className="min-w-0 flex-1">
        Approve this plan?
      </Text>
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
    </View>
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
    <PlanDocument content={props.proposal.content} layout="sheet" />
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
