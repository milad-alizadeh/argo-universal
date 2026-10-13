import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { ElicitationForm } from '../../../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationProps } from '../../../src/features/requests/components/request.mocks';
import { RequestFrame } from '../../../src/lib/product/request-frame';
import { questionsRequest } from '../../elicitation-questions';

export const meta = {
  component: ElicitationForm,
  args: { ...elicitationProps({ request: questionsRequest }), onAnswer: fn() },
  render: (args): ReactElement => (
    <RequestFrame>
      <ElicitationForm {...args} />
    </RequestFrame>
  ),
} satisfies Meta<typeof ElicitationForm>;

export type Story = StoryObj<typeof meta>;

export const buildFeature = 'Build a feature';

export const previousQuestion = 'Previous question';

export const nextQuestion = 'Next question';

export const fixBug = 'Fix a bug';

export const exploreIdea = 'Explore an idea';

export const customAnswer = 'Custom answer';

export const releaseReview = 'Review the release';
