import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn, type within } from 'storybook/test';
import { PlanProposalCard } from '../../../src/features/requests/components/plan-proposal-card/plan-proposal-card';
import {
  PlanProposalPreview,
  shortPlanProposal,
} from '../../plan-proposal-mock';

export const meta = {
  title: 'Tests/PlanProposalCard',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: {
    proposal: shortPlanProposal,
    onAnswer: fn(),
    state: { kind: 'open' },
  },
  render: (args): React.JSX.Element => <PlanProposalPreview {...args} />,
} satisfies Meta<typeof PlanProposalCard>;
export type Story = StoryObj<typeof meta>;
export type PlayContext = Parameters<NonNullable<Story['play']>>[0];
export type Canvas = ReturnType<typeof within>;
export const dark = { globals: { mode: 'dark' } };

export const documentLabel = 'Plan proposal document';
export const approvePlanQuestion = 'Approve this plan?';
export const keepPlanningLabel = 'Keep planning';
export const expandPlanLabel = 'Expand plan';
export const expandedPlanLabel = 'Expanded plan';
export const collapsePlanLabel = 'Collapse plan';
export const answeredElsewhereMessage = 'Already answered on another device';
export const feedbackDraft = 'Keep this feedback';
