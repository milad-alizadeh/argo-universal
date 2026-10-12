import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { allToasts, findToast } from '../../../../mocks/find-toast';
import { ErrorToastExample, failedOpen } from '../../../../mocks/toast-mock';

const meta = {
  title: 'Tests/Toast',
  component: ErrorToastExample,
} satisfies Meta<typeof ErrorToastExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsTheFailureOnce: Story = {
  play: async () => {
    await findToast(failedOpen.title);
    await expect(await allToasts(failedOpen.title)).toHaveLength(1);
  },
};

export const ShowsTheMessageUnderTheTitle: Story = {
  play: async () => {
    await expect(await findToast(failedOpen.message)).toBeVisible();
  },
};
