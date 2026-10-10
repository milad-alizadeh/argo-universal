import type {
  PendingPlanProposal,
  SessionAnswerPlanProposalInput,
} from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { Icon } from '../lib/icon';
import { useWide } from '../navigation/use-wide';
import { useContentWide } from './content-layout';
import { PlanDocument } from './plan-document';
import { PlanProposalExpansion } from './plan-proposal-expansion';
import { RequestCard, type RequestState } from './request-card';

const flexibleContentClassName = 'flex-1 min-h-0';

type PlanProposalAnswer =
  | Omit<
      Extract<SessionAnswerPlanProposalInput, { decision: 'approve' }>,
      'sessionId'
    >
  | Omit<
      Extract<SessionAnswerPlanProposalInput, { decision: 'keep_planning' }>,
      'sessionId'
    >;

export interface PlanProposalCardProps {
  proposal: PendingPlanProposal;
  onAnswer: (answer: PlanProposalAnswer) => void;
  state: RequestState;
  error?: string;
}

export function PlanProposalCard(
  props: PlanProposalCardProps,
): React.JSX.Element {
  return <PlanProposalInteraction key={props.proposal.planId} {...props} />;
}

function PlanProposalInteraction({
  proposal,
  onAnswer,
  state,
  error,
}: PlanProposalCardProps): React.JSX.Element {
  const wide = useContentWide();
  const windowWide = useWide();
  const answered = state.kind === 'answered';
  const submitting = state.kind === 'submitting';
  const inactive = state.kind !== 'open';
  const [planning, setPlanning] = useState(false);
  const answerLabel = planning ? 'Keep planning' : 'Approve';
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);
  const submit = (): void => {
    if (inactive || (planning && !feedback.trim())) return;
    setExpanded(false);
    if (planning) {
      onAnswer({
        planId: proposal.planId,
        decision: 'keep_planning',
        feedback,
      });
    } else onAnswer({ planId: proposal.planId, decision: 'approve' });
  };
  const back = (): void => {
    if (planning) setPlanning(false);
    else setExpanded(false);
  };
  const panel = (
    <RequestCard
      state={state}
      error={error}
      onEnter={submit}
      onEscape={back}
      testID="plan-proposal-card"
      mutedStatus
      className={cn(
        'z-10',
        expanded &&
          'max-w-none flex-1 min-h-0 web:backdrop-blur-none web:backdrop-saturate-100',
        expanded && windowWide && 'bg-background',
        expanded &&
          !windowWide &&
          'rounded-none border-0 shadow-none bg-popover',
      )}
      bodyClassName={expanded ? flexibleContentClassName : undefined}
      footerClassName={cn(
        'min-h-0',
        planning || answered ? 'justify-between' : 'justify-end',
        expanded && !windowWide && 'px-4',
      )}
      actions={
        <>
          <Button
            disabled={inactive}
            onPress={() => setPlanning(!planning)}
            variant={wide ? 'ghost' : 'secondary'}
            className={cn(
              'px-3',
              wide
                ? 'h-8 sm:h-8 flex-none rounded-md'
                : 'h-11 sm:h-11 flex-1 rounded-lg',
            )}
          >
            <Text className={planning ? 'text-muted-foreground' : undefined}>
              {planning ? 'Back' : 'Keep planning'}
            </Text>
          </Button>
          <Button
            onPress={submit}
            disabled={inactive || (planning && !feedback.trim())}
            className={cn(
              'pl-3',
              wide
                ? 'h-8 sm:h-8 flex-none rounded-md pr-1.5'
                : 'h-11 sm:h-11 flex-1 rounded-lg pr-3',
            )}
          >
            <Text role={submitting ? 'status' : undefined}>
              {submitting ? 'Sending…' : answerLabel}
            </Text>
            {wide && (
              <View className="size-5 rounded-sm items-center justify-center bg-primary-foreground/15">
                <Icon name="return" className="text-primary-foreground" />
              </View>
            )}
          </Button>
        </>
      }
      heading={
        expanded &&
        !windowWide && (
          <View className="items-center pt-1.5 pb-2" aria-hidden>
            <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
          </View>
        )
      }
    >
      <View
        className={cn(
          'gap-2',
          expanded ? flexibleContentClassName : 'px-4 pt-4 pb-1',
        )}
      >
        <View
          className={
            expanded ? cn('px-4 pb-2', windowWide ? 'pt-4' : 'pt-2') : undefined
          }
        >
          <View className="flex-row items-center gap-1.5">
            <Icon name="plan-mode" className="text-muted-foreground" />
            <Text className="min-w-0 flex-1 type-heading">
              Approve this plan?
            </Text>
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={expanded ? 'Collapse plan' : 'Expand plan'}
              onPress={() => setExpanded(!expanded)}
              className="size-7 sm:size-7 -my-0.75 -mr-1.5"
            >
              <Icon
                name={expanded ? 'collapse' : 'expand'}
                className="text-muted-foreground"
              />
            </Button>
          </View>
        </View>
        <PlanDocument
          content={proposal.content}
          layout={expanded ? 'expanded' : 'proposal'}
        />
        {planning && !answered && (
          <View className={cn('gap-1.5 pt-1', expanded && 'px-4')}>
            <Text className="type-body">What should change in the plan?</Text>
            <Textarea
              autoFocus
              accessibilityLabel="What should change in the plan?"
              placeholder="Tell the Agent what to change"
              value={feedback}
              editable={!inactive}
              onChangeText={setFeedback}
              className="min-h-16 max-h-32 type-control bg-background dark:bg-background focus:border-ring focus:ring-[3px] focus:ring-ring/25 focus-visible:ring-ring/25 web:resize-none"
            />
            <Text className="type-secondary">
              Required. The Agent keeps planning with it.
            </Text>
          </View>
        )}
      </View>
    </RequestCard>
  );
  return expanded ? (
    <PlanProposalExpansion onCollapse={() => setExpanded(false)}>
      {panel}
    </PlanProposalExpansion>
  ) : (
    panel
  );
}
