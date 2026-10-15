import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { FeedMarkdown } from './markdown/feed-markdown';
import {
  PlanBottomFade,
  PlanScrollThumb,
  PlanScrollView,
  type ScrolledPlanStyle,
  usePlanScroll,
} from './plan-document-scroll';

const flexibleContentClassName = 'flex-1 min-h-0';

const cardClassName = 'bg-card rounded-xl shadow-control';

const proposalScrollClassName = 'max-h-plan-proposal grow-0';

const proposalLabel = 'Plan proposal document';

const proposalTestID = 'plan-proposal-scroll';

const scrolledPlanStyles = {
  proposal: {
    frame: cn('max-h-plan-proposal', cardClassName),
    scroll: proposalScrollClassName,
    content: 'px-3.5 py-3',
    testID: proposalTestID,
    label: proposalLabel,
    fades: true,
  },
  expanded: {
    frame: cn(flexibleContentClassName, cardClassName),
    scroll: flexibleContentClassName,
    content: 'px-4 pt-2 pb-4',
    testID: proposalTestID,
    label: proposalLabel,
    fades: false,
  },
  tray: {
    frame: 'max-h-plan-proposal',
    scroll: proposalScrollClassName,
    content: 'px-4 pt-2 pb-4',
    testID: undefined,
    label: 'Written plan document',
    fades: false,
  },
} satisfies Record<string, ScrolledPlanStyle>;

interface PlanDocumentProps {
  content: string;
  layout: keyof typeof scrolledPlanStyles | 'sheet' | 'request-sheet';
}

export function PlanDocument({
  content,
  layout,
}: PlanDocumentProps): React.JSX.Element {
  const markdown = <FeedMarkdown text={content} variant="proposal" />;

  if (layout === 'request-sheet') return markdown;

  if (layout === 'sheet') return <View className="pt-2 pb-4">{markdown}</View>;

  return (
    <ScrolledPlan style={scrolledPlanStyles[layout]}>{markdown}</ScrolledPlan>
  );
}

function ScrolledPlan(props: {
  style: ScrolledPlanStyle;
  children: React.ReactNode;
}): React.JSX.Element {
  const { metrics, handlers } = usePlanScroll();

  return (
    <View className={cn('relative overflow-hidden', props.style.frame)}>
      <PlanScrollView style={props.style} handlers={handlers}>
        {props.children}
      </PlanScrollView>
      {props.style.fades && <PlanBottomFade metrics={metrics} />}
      <PlanScrollThumb metrics={metrics} />
    </View>
  );
}
