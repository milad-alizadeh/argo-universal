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
    await expect(sheet.getByRole('textbox', { name: 'Title' })).toBeVisible();
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
