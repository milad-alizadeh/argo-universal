import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import {
  createRequestFixtures,
  elicitationMocks,
  permissionMocks,
  RequestAnsweringPreview,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';

const meta = {
  title: 'Tests/RequestAnswering',
  component: RequestAnsweringPreview,
  parameters: { previewPadding: false },
} satisfies Meta<typeof RequestAnsweringPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

function permission(index: number, width: number, conflict = false): Story {
  const mock = permissionMocks[index];
  if (!mock) throw new Error('Both Agent Permission recordings are required.');
  const fixtures = createRequestFixtures(mock, conflict);
  return {
    args: { mock },
    parameters: { trpc: fixtures },
    beforeEach: () => fixtures.reset(),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Allow once' }),
      );
      if (conflict) {
        await expect(await canvas.findByRole('status')).toHaveTextContent(
          'Already answered on another device',
        );
        return;
      }
      await expect(
        await canvas.findByText('You allowed this once'),
      ).toBeVisible();
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    },
  };
}
export const FirstAgentPermissionPhone = permission(0, 390);
export const FirstAgentPermissionWide = permission(0, 1440);
export const SecondAgentPermissionPhone = permission(1, 390);
export const SecondAgentPermissionWide = permission(1, 1440);
export const PermissionConflictPhone = permission(0, 390, true);
export const PermissionConflictWide = permission(1, 1440, true);

function elicitation(index: number, width: number, conflict = false): Story {
  const mock = elicitationMocks[index];
  if (!mock) throw new Error('Both Agent Elicitation recordings are required.');
  const fixtures = createRequestFixtures(mock, conflict);
  return {
    args: { mock },
    parameters: { trpc: fixtures },
    beforeEach: () => fixtures.reset(),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: /^Color/ }),
      );
      await userEvent.click(
        await within(document.body).findByRole('option', { name: 'Blue' }),
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      if (conflict) {
        await expect(await canvas.findByRole('status')).toHaveTextContent(
          'Already answered on another device',
        );
        return;
      }
      await expect(await canvas.findByText('You answered')).toBeVisible();
      await expect(canvas.getByText('Blue', { exact: true })).toBeVisible();
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    },
  };
}
export const FirstAgentElicitationPhone = elicitation(0, 390);
export const FirstAgentElicitationWide = elicitation(0, 1440);
export const SecondAgentElicitationPhone = elicitation(1, 390);
export const SecondAgentElicitationWide = elicitation(1, 1440);
export const ElicitationConflictPhone = elicitation(0, 390, true);
export const ElicitationConflictWide = elicitation(1, 1440, true);
