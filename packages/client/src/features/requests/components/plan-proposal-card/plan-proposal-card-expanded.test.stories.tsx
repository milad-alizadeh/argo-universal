import { answerCollapsesExpansion } from '../../../../../mocks/requests/plan-proposal/answer-collapses-expansion.test.mocks';
import { expanded } from '../../../../../mocks/requests/plan-proposal/expanded-plan.test.mocks';
import {
  dark,
  meta as planProposalTestMeta,
  type Story,
} from '../../../../../mocks/requests/plan-proposal/plan-proposal-story-context.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';

const meta = { ...planProposalTestMeta, title: 'Tests/PlanProposalCard' };
export default meta;

export const ExpandedPhone = expanded(layoutWidths.phone);
export const ExpandedWide = expanded(layoutWidths.wide);
export const ExpandedPhoneDark: Story = { ...ExpandedPhone, ...dark };
export const ExpandedWideDark: Story = { ...ExpandedWide, ...dark };
export const AnswerCollapsesExpansionPhone = answerCollapsesExpansion(
  layoutWidths.phone,
);
export const AnswerCollapsesExpansionWide = answerCollapsesExpansion(
  layoutWidths.wide,
);
