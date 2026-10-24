import { settleViewport } from '@repo/kit/settle-viewport';
import type { ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import {
  buildFeature,
  customAnswer,
  meta as questionTestMeta,
  nextQuestion,
  previousQuestion,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-question-story.test.mocks';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { ElicitationSheet } from './elicitation-sheet';

const meta = {
  ...questionTestMeta,
  title: 'Tests/Requests/ElicitationForm/QuestionSheet',
};

export default meta;

// The work options are checkbox rows whose names start with their titles.
const option = (scope: ReturnType<typeof within>, title: string): HTMLElement =>
  scope.getByRole('checkbox', { name: new RegExp(`^${title}`) });

export const RetainAnswersAcrossSheetTransition: Story = {
  render: (args): ReactElement => (
    <RequestFrame>
      <ElicitationSheet {...args} />
    </RequestFrame>
  ),
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: customAnswer }),
      'Keep my answer',
    );
    await userEvent.click(canvas.getByRole('button', { name: nextQuestion }));
    await userEvent.click(option(canvas, buildFeature));
    await settleViewport(390);
    const sheet = within(await within(document.body).findByRole('dialog'));
    await expect(option(sheet, buildFeature)).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(
      sheet.getByRole('button', { name: previousQuestion }),
    );
    await expect(
      sheet.getByRole('textbox', { name: customAnswer }),
    ).toHaveValue('Keep my answer');
  },
};
