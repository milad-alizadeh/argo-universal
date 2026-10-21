import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Markdown } from '#primitives/content/markdown';
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

// A Permission request's plan sits right under its title, as close as one step to the next.
const requestPlanStyle: ScrolledPlanStyle = {
  ...trayPlanStyle,
  content: 'px-4 pb-4',
};

// Full page, it fills what the Session column gives it.
const fillPlanStyle: ScrolledPlanStyle = {
  ...requestPlanStyle,
  frame: 'min-h-0 flex-1',
  scroll: 'flex-1',
};

const scrolledPlanStyles = {
  tray: trayPlanStyle,
  request: requestPlanStyle,
  fill: fillPlanStyle,
} as const;

interface PlanDocumentProps {
  content: string;
  layout: 'sheet' | keyof typeof scrolledPlanStyles;
}

export function PlanDocument({
  content,
  layout,
}: PlanDocumentProps): React.JSX.Element {
  const markdown = <Markdown text={content} />;

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
      <PlanScrollThumb metrics={metrics} />
    </View>
  );
}
