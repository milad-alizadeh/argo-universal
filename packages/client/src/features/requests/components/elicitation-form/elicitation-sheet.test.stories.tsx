import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  elicitationProps,
  elicitationMock,
  fieldsRequest,
  fieldsValues,
} from '../request.mocks';
import { ElicitationSheet } from './elicitation-sheet';

const meta = {
  title: 'Tests/ElicitationSheet',
  component: ElicitationSheet,
  beforeEach: async (): Promise<void> => {
    await settleViewport(390);
  },
  args: { ...elicitationProps({ mock: elicitationMock }), onAnswer: fn() },
} satisfies Meta<typeof ElicitationSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
const titleLabel = 'Title';
const retainedDraft = 'Keep this draft';

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
    request: fieldsRequest,
    initialValues: { ...fieldsValues, estimate: '8' },
  },
  play: async ({ userEvent, args }) => {
    const page = within(document.body);
    const sheet = within(await page.findByRole('dialog'));
    await expect(
      sheet.getByRole('textbox', { name: titleLabel }),
    ).toBeVisible();
    await userEvent.click(sheet.getByRole('button', { name: /^Team/ }));
    await userEvent.click(await page.findByRole('option', { name: 'Desktop' }));
    await userEvent.click(
      sheet.getByRole('checkbox', { name: 'Notify the team' }),
    );
    await userEvent.click(sheet.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: {
        title: 'Drafts vanish after a reconnect',
        team: 'Desktop',
        estimate: 8,
        notify: false,
      },
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
    request: fieldsRequest,
    initialValues: { ...fieldsValues, estimate: '8' },
  },
  play: async ({ userEvent, args }) => {
    const page = within(document.body);
    const sheet = within(await page.findByRole('dialog'));
    const title = sheet.getByRole('textbox', { name: titleLabel });
    await userEvent.clear(title);
    await userEvent.type(title, retainedDraft);
    await settleViewport(1440);
    const tray = within(
      await page.findByRole('region', { name: 'Elicitation questions' }),
    );
    await expect(tray.getByRole('textbox', { name: titleLabel })).toHaveValue(
      retainedDraft,
    );
    await userEvent.click(tray.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: {
        title: retainedDraft,
        team: 'Mobile',
        estimate: 8,
        notify: true,
      },
    });
  },
};
