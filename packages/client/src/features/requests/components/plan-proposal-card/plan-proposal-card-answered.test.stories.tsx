import { planProposalMocks } from '../../../../../mocks/plan-proposal-mock';
import { answered } from '../../../../../mocks/requests/plan-proposal/answered-plan.test.mocks';
import {
  dark,
  meta as planProposalTestMeta,
  type Story,
} from '../../../../../mocks/requests/plan-proposal/plan-proposal-story-context.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';

const meta = { ...planProposalTestMeta, title: 'Tests/PlanProposalCard' };

export default meta;

export const AnsweredPhone = answered(layoutWidths.phone);

export const AnsweredWide = answered(layoutWidths.wide);

export const FirstAgentAnsweredPhone = answered(
  layoutWidths.phone,
  planProposalMocks[0]?.proposal,
);

export const FirstAgentAnsweredWide = answered(
  layoutWidths.wide,
  planProposalMocks[0]?.proposal,
);

export const AnsweredPhoneDark: Story = { ...AnsweredPhone, ...dark };

export const AnsweredWideDark: Story = { ...AnsweredWide, ...dark };
