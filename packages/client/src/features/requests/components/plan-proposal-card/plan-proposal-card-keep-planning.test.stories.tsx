import { expandWhilePlanning } from '../../../../../mocks/requests/plan-proposal/expand-while-planning.test.mocks';
import {
  keepPlanning,
  keepPlanningWithFeedback,
} from '../../../../../mocks/requests/plan-proposal/keep-planning.test.mocks';
import {
  dark,
  meta as planProposalTestMeta,
  type Story,
} from '../../../../../mocks/requests/plan-proposal/plan-proposal-story-context.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';

const meta = { ...planProposalTestMeta, title: 'Tests/PlanProposalCard' };

export default meta;

export const KeepPlanningPhone = keepPlanning(layoutWidths.phone);

export const KeepPlanningWide = keepPlanning(layoutWidths.wide);

export const KeepPlanningWithFeedbackPhone = keepPlanningWithFeedback(
  layoutWidths.phone,
);

export const KeepPlanningWithFeedbackWide = keepPlanningWithFeedback(
  layoutWidths.wide,
);

export const KeepPlanningPhoneDark: Story = { ...KeepPlanningPhone, ...dark };

export const KeepPlanningWideDark: Story = { ...KeepPlanningWide, ...dark };

export const KeepPlanningWithFeedbackPhoneDark: Story = {
  ...KeepPlanningWithFeedbackPhone,
  ...dark,
};

export const KeepPlanningWithFeedbackWideDark: Story = {
  ...KeepPlanningWithFeedbackWide,
  ...dark,
};

export const ExpandWhilePlanningPhone = expandWhilePlanning(layoutWidths.phone);

export const ExpandWhilePlanningWide = expandWhilePlanning(layoutWidths.wide);
