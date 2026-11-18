import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { questionsRequest } from '../../../../../mocks/elicitation-questions';
import {
  elicitationProps,
  elicitationMock,
  configurationRequest,
  configurationValues,
  refactorRequest,
} from '../request.mocks';
import { ElicitationSheet } from './elicitation-sheet';

const meta = {
  title: 'Tests/Requests/ElicitationSheet',
  component: ElicitationSheet,
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
  args: { ...elicitationProps({ mock: elicitationMock }), onAnswer: fn() },
} satisfies Meta<typeof ElicitationSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const retainedDraft = 'keep-this-draft';

const nextQuestion = 'Next question';

export const MixedQuestionsArePaged: Story = {
  args: {
    request: {
      ...configurationRequest,
      requestedSchema: {
        properties: {
          work: { type: 'string', title: 'Work', enum: ['Build', 'Fix'] },
          work_other: { type: 'string', title: 'Other' },
          detail: { type: 'string', title: 'Detail', minLength: 3 },
        },
        required: ['detail'],
      },
    },
  },
  play: async ({ userEvent, args }) => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await expect(sheet.getByText('1 of 2', { exact: false })).toBeVisible();
    await expect(sheet.queryByRole('textbox', { name: /^Detail/ })).toBeNull();
    await userEvent.click(sheet.getByRole('radio', { name: /^Build/ }));
    await userEvent.type(
      sheet.getByRole('textbox', { name: 'Other' }),
      'A note',
    );
    await userEvent.click(sheet.getByRole('button', { name: 'Next' }));
    await expect(args.onAnswer).not.toHaveBeenCalled();
    await expect(sheet.queryByRole('radio', { name: /^Build/ })).toBeNull();
    await userEvent.type(
      sheet.getByRole('textbox', { name: /^Detail/ }),
      'Details',
    );
    await userEvent.click(
      sheet.getByRole('button', { name: 'Previous question' }),
    );
    await expect(sheet.getByRole('textbox', { name: 'Other' })).toHaveValue(
      'A note',
    );
    await userEvent.click(sheet.getByRole('button', { name: 'Next' }));
    await userEvent.click(sheet.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: { work: 'Build', work_other: 'A note', detail: 'Details' },
    });
  },
};

export const SubmitReturnsToUnansweredPage: Story = {
  args: { request: configurationRequest },
  play: async ({ userEvent, args }) => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: nextQuestion }));
    await userEvent.click(sheet.getByRole('button', { name: nextQuestion }));
    await userEvent.click(sheet.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).not.toHaveBeenCalled();
    await expect(sheet.getByText('1 of 3', { exact: false })).toBeVisible();
    await expect(sheet.getByRole('textbox', { name: /^Name/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Next' })).toBeDisabled();
  },
};

export const DismissWithEscape: Story = {
  play: async ({ userEvent, args }) => {
    const page = within(document.body);
    await expect(await page.findByRole('dialog')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
  },
};

export const SubmitFields: Story = {
  args: {
    request: configurationRequest,
    initialValues: { ...configurationValues, port: '8080' },
  },
  play: async ({ userEvent, args }) => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: 'Next' }));
    await userEvent.click(sheet.getByRole('button', { name: 'Next' }));
    // Expo's web switch hides its input under the drawn track, so a press lands on its title.
    await userEvent.click(sheet.getByText('Enable logging'));
    await userEvent.click(sheet.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: { name: 'argo-server', port: 8080, enableLogging: false },
    });
  },
};

export const SkipLastQuestion: Story = {
  args: { request: refactorRequest },
  play: async ({ userEvent, args }) => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: 'Skip' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: {},
    });
  },
};

export const SendingKeepsSheetOpen: Story = {
  args: { state: { kind: 'submitting' } },
  play: async ({ userEvent, args }) => {
    const page = within(document.body);
    await expect(await page.findByRole('dialog')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

export const RetainFieldAnswersAcrossTrayTransition: Story = {
  args: {
    request: configurationRequest,
    initialValues: { ...configurationValues, port: '8080' },
  },
  play: async ({ userEvent, args }) => {
    const page = within(document.body);
    const sheet = within(await page.findByRole('dialog'));
    const name = sheet.getByRole('textbox', { name: /^Name/ });
    await userEvent.clear(name);
    await userEvent.type(name, retainedDraft);
    await settleLayout('wide');

    const tray = within(
      await page.findByRole('region', { name: 'Elicitation questions' }),
    );

    await expect(tray.getByRole('textbox', { name: /^Name/ })).toHaveValue(
      retainedDraft,
    );
    await userEvent.click(tray.getByRole('button', { name: 'Next' }));
    await userEvent.click(tray.getByRole('button', { name: 'Next' }));
    await userEvent.click(tray.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: { name: retainedDraft, port: 8080, enableLogging: true },
    });
  },
};

// The card heads itself with the message once.
export const MessageShownOnce: Story = {
  args: { request: configurationRequest },
  play: async () => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await expect(
      sheet.getAllByRole('heading', { name: configurationRequest.message }),
    ).toHaveLength(1);
  },
};

// Each question heads its own page, so the sheet adds no title repeating the message.
export const QuestionShownOnce: Story = {
  args: { request: questionsRequest },
  play: async ({ userEvent }) => {
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: nextQuestion }));
    await expect(sheet.getByText('2 of 3', { exact: false })).toBeVisible();
    await expect(
      sheet.getAllByRole('heading', { name: questionsRequest.message }),
    ).toHaveLength(1);
  },
};
