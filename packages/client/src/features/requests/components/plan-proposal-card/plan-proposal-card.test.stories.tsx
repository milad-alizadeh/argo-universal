import {
  longPlan,
  open,
  shortPlan,
} from '../../../../../mocks/requests/plan-proposal/approve-plan.test.mocks';
import {
  dark,
  meta as planProposalTestMeta,
  type Story,
} from '../../../../../mocks/requests/plan-proposal/plan-proposal-story-context.test.mocks';
import { recordedAnswer } from '../../../../../mocks/requests/plan-proposal/recorded-answer.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';

const meta = { ...planProposalTestMeta, title: 'Tests/PlanProposalCard' };

export default meta;

export const ShortPlan: Story = shortPlan;

export const LongPlan = longPlan(layoutWidths.phone);

export const LongPlanWide = longPlan(layoutWidths.wide);

export const FirstAgentOpenPhone = open(layoutWidths.phone, 0);

export const FirstAgentOpenWide = open(layoutWidths.wide, 0);

export const SecondAgentOpenPhone = open(layoutWidths.phone, 2);

export const SecondAgentOpenWide = open(layoutWidths.wide, 2);

export const ShortPlanDark: Story = { ...ShortPlan, ...dark };

export const LongPlanDark: Story = { ...LongPlan, ...dark };

export const LongPlanWideDark: Story = { ...LongPlanWide, ...dark };

export const FirstRecordedAnswer: Story = recordedAnswer(0);

export const SecondRecordedAnswer: Story = recordedAnswer(1);

export const ThirdRecordedAnswer: Story = recordedAnswer(2);

export const FourthRecordedAnswer: Story = recordedAnswer(3);
