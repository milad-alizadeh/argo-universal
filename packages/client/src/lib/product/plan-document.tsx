import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { FeedMarkdown } from './markdown/feed-markdown';
import {
  PlanScrollThumb,
  PlanScrollView,
  type ScrolledPlanStyle,
  usePlanScroll,
} from './plan-document-scroll';

const trayPlanStyle: ScrolledPlanStyle = {
  frame: 'max-h-70',
  scroll: 'max-h-70',
  content: 'px-4 pt-2 pb-4',
  label: 'Written plan document',
};

// A Permission request's plan shown full page: it fills what the Session column gives it.
const fillPlanStyle: ScrolledPlanStyle = {
  frame: 'min-h-0 flex-1',
  scroll: 'flex-1',
  content: 'px-4 pt-2 pb-4',
  label: 'Written plan document',
};

interface PlanDocumentProps {
  content: string;
  layout: 'tray' | 'sheet' | 'fill';
}

export function PlanDocument({
  content,
  layout,
}: PlanDocumentProps): React.JSX.Element {
  const markdown = <FeedMarkdown text={content} variant="plan" />;

  if (layout === 'sheet') return <View className="pt-2 pb-4">{markdown}</View>;

  return (
    <ScrolledPlan style={layout === 'fill' ? fillPlanStyle : trayPlanStyle}>
      {markdown}
    </ScrolledPlan>
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
      <PlanScrollThumb metrics={metrics} />
    </View>
  );
}
