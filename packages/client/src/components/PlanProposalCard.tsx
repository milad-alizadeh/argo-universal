import type {
  PendingPlanProposal,
  SessionAnswerPlanProposalInput,
} from '@repo/contracts';
import {
  ArrowElbowDownLeftIcon,
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  InfoIcon,
  MapTrifoldIcon,
} from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { useWide } from '../navigation/use-wide';
import { FeedMarkdown } from './FeedMarkdown';
import { Icon } from './Icon';
import { PlanProposalExpansion } from './PlanProposalExpansion';
import { ScrollFade } from './ScrollFade';
import { usePlanProposalKeyboard } from './use-plan-proposal-keyboard';

export type PlanProposalAnswer =
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
  answered?: boolean;
}

export function PlanProposalCard(props: PlanProposalCardProps) {
  return <PlanProposalInteraction key={props.proposal.planId} {...props} />;
}

function PlanProposalInteraction({
  proposal,
  onAnswer,
  answered = false,
}: PlanProposalCardProps) {
  const wide = useWide();
  const card = useRef<View>(null);
  const [planning, setPlanning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);
  const submit = () => {
    if (answered || (planning && !feedback.trim())) return;
    setExpanded(false);
    if (planning) {
      onAnswer({
        planId: proposal.planId,
        decision: 'keep_planning',
        feedback,
      });
    } else onAnswer({ planId: proposal.planId, decision: 'approve' });
  };
  const back = () => {
    if (planning) setPlanning(false);
    else setExpanded(false);
  };
  usePlanProposalKeyboard(card, submit, back);
  const panel = (
    <View
      ref={card}
      testID="plan-proposal-card"
      className={cn(
        'w-full z-10',
        !expanded &&
          'max-w-composer rounded-xl border border-input/80 bg-background/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110',
        expanded && 'flex-1 min-h-0',
        expanded &&
          wide &&
          'rounded-xl border border-input/80 bg-background shadow-composer',
        expanded && !wide && 'bg-popover',
      )}
    >
      {expanded && !wide && (
        <View className="items-center pt-1.5 pb-2" aria-hidden>
          <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
        </View>
      )}
      <View
        className={cn(
          'gap-2',
          expanded ? 'flex-1 min-h-0' : 'px-4 pt-4 pb-1',
          answered && 'opacity-50',
        )}
      >
        <View className={expanded ? 'px-4 pt-2 pb-2 wide:pt-4' : undefined}>
          <View className="flex-row items-center gap-1.5">
            <Icon as={MapTrifoldIcon} className="text-muted-foreground" />
            <Text className="min-w-0 flex-1 text-sm leading-5.5 font-semibold">
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
                as={expanded ? ArrowsInSimpleIcon : ArrowsOutSimpleIcon}
                className="text-muted-foreground"
              />
            </Button>
          </View>
        </View>
        <PlanProposalBody content={proposal.content} expanded={expanded} />
        {planning && !answered && (
          <View className={cn('gap-1.5 pt-1', expanded && 'px-4')}>
            <Text className="text-sm leading-5 font-medium">
              What should change in the plan?
            </Text>
            <Textarea
              autoFocus
              accessibilityLabel="What should change in the plan?"
              placeholder="Tell the Agent what to change"
              value={feedback}
              onChangeText={setFeedback}
              className="min-h-16 max-h-32 text-sm leading-5 bg-background dark:bg-background focus:border-ring focus:ring-[3px] focus:ring-ring/25 focus-visible:ring-ring/25 web:resize-none"
            />
            <Text className="text-sm leading-5 text-muted-foreground">
              Required. The Agent keeps planning with it.
            </Text>
          </View>
        )}
      </View>
      <View
        className={cn(
          'flex-row items-center gap-1 px-2 pb-2 pt-3',
          planning || answered ? 'justify-between' : 'justify-end',
          expanded && !wide && 'px-4',
        )}
      >
        {answered && (
          <View className="flex-1 flex-row items-center gap-1.5 px-2">
            <Icon as={InfoIcon} className="text-muted-foreground" />
            <Text className="text-sm leading-5 text-muted-foreground">
              Already answered on another device
            </Text>
          </View>
        )}
        {(!answered || wide) && (
          <>
            <Button
              disabled={answered}
              onPress={() => setPlanning(!planning)}
              variant={wide ? 'ghost' : 'secondary'}
              className="h-11 sm:h-11 flex-1 rounded-lg wide:h-8 wide:sm:h-8 wide:flex-none wide:rounded-md px-3"
            >
              <Text className={planning ? 'text-muted-foreground' : undefined}>
                {planning ? 'Back' : 'Keep planning'}
              </Text>
            </Button>
            <Button
              onPress={submit}
              disabled={answered || (planning && !feedback.trim())}
              className="h-11 sm:h-11 flex-1 rounded-lg wide:h-8 wide:sm:h-8 wide:flex-none wide:rounded-md pl-3 pr-3 wide:pr-1.5"
            >
              <Text>{planning ? 'Keep planning' : 'Approve'}</Text>
              {wide && (
                <View className="size-5 rounded-sm items-center justify-center bg-primary-foreground/15">
                  <Icon
                    as={ArrowElbowDownLeftIcon}
                    className="text-primary-foreground"
                  />
                </View>
              )}
            </Button>
          </>
        )}
      </View>
    </View>
  );
  return expanded ? (
    <PlanProposalExpansion onCollapse={() => setExpanded(false)}>
      {panel}
    </PlanProposalExpansion>
  ) : (
    panel
  );
}

function PlanProposalBody({
  content,
  expanded,
}: {
  content: string;
  expanded: boolean;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const overflow = contentHeight > viewportHeight + 1;
  const thumbHeight =
    (viewportHeight * viewportHeight) / Math.max(1, contentHeight);
  return (
    <View
      className={cn(
        'relative overflow-hidden',
        expanded
          ? 'flex-1 min-h-0'
          : 'max-h-plan-proposal bg-secondary rounded-md',
      )}
    >
      <ScrollView
        testID="plan-proposal-scroll"
        className={expanded ? 'flex-1 min-h-0' : 'max-h-plan-proposal grow-0'}
        contentContainerClassName={expanded ? 'px-4 pt-2 pb-4' : 'p-3'}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onLayout={({ nativeEvent }) =>
          setViewportHeight(nativeEvent.layout.height)
        }
        onScroll={({ nativeEvent }) => setOffset(nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <FeedMarkdown text={content} variant="proposal" />
      </ScrollView>
      {!expanded && overflow && contentHeight - viewportHeight - offset > 1 && (
        <ScrollFade edge="bottom" className="bg-secondary" height={40} />
      )}
      {overflow && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          aria-hidden
          className="absolute right-1 w-1 rounded-full bg-foreground/20"
          style={{
            height: thumbHeight,
            top:
              (offset * (viewportHeight - thumbHeight)) /
              (contentHeight - viewportHeight),
          }}
        />
      )}
    </View>
  );
}
