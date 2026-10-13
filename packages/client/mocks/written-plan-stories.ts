import type { ComponentProps } from 'react';
import type { Composer } from '../src/features/composer/components/composer/composer';
import { recordedAcpContent } from '../src/lib/product/acp-feed-content.mocks';
import type { MockAgent } from '../src/lib/product/feed-message.mocks';
import { composerProps } from './composer-mock';
import { longWrittenPlan } from './feed-paper';
import { opensWrittenPlan } from './written-plan-open-checks';
import { readsLongWrittenPlan } from './written-plan-scroll-checks';
import type {
  WrittenPlanScenario,
  WrittenPlanStory,
} from './written-plan-story-types';
type DefaultArgs = Pick<
  ComponentProps<typeof Composer>,
  'draft' | 'onDraftChange' | 'onAttachImages' | 'onSend'
>;
function recordedWrittenPlan({
  agent,
  form,
}: WrittenPlanScenario): NonNullable<
  ComponentProps<typeof Composer>['writtenPlan']
> {
  const row = recordedAcpContent(agent).rows.find(
    (row) => row.sessionUpdate === 'plan_update' && row.plan.type === form,
  );
  if (!isRecordedWrittenPlan(row))
    throw new Error(`Recording needs ${form} Plan for ${agent}`);
  return row.plan;
}
export function openingWrittenPlan(
  scenario: WrittenPlanScenario,
  defaults: DefaultArgs,
): WrittenPlanStory {
  return {
    args: {
      ...composerProps({ ...defaults, initialAgent: scenario.agent }),
      writtenPlan: recordedWrittenPlan(scenario),
    },
    play: (context) => opensWrittenPlan(scenario, context),
  };
}
export function readingLongWrittenPlan(
  { width, agent }: { width: number; agent: MockAgent },
  defaults: DefaultArgs,
): WrittenPlanStory {
  return {
    args: {
      ...composerProps({ ...defaults, initialAgent: agent }),
      writtenPlan: longWrittenPlan,
    },
    play: (context) => readsLongWrittenPlan(width, context),
  };
}

type RecordedRow = ReturnType<typeof recordedAcpContent>['rows'][number];
type RecordedWrittenPlanRow = Extract<
  RecordedRow,
  { sessionUpdate: 'plan_update' }
> & {
  plan: NonNullable<ComponentProps<typeof Composer>['writtenPlan']>;
};
function isRecordedWrittenPlan(
  row: RecordedRow | undefined,
): row is RecordedWrittenPlanRow {
  return row?.sessionUpdate === 'plan_update' && row.plan.type !== 'items';
}
