import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PermissionPreview } from '../../../../../mocks/requests/permission/permission-gallery';
import { argoPermission } from './permission-request-fixtures';

const meta = {
  title: 'Tests/Requests/PermissionRequest/Argo',
  render: (args): JSX.Element => <PermissionPreview {...args} />,
  args: { ...argoPermission, onAnswer: fn() },
} satisfies Meta<typeof PermissionPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Operation: Story = {
  play: async ({ args }) => {
    await settleLayout(1440);
    const canvas = within(document.body);
    await expect(
      canvas.getByText(argoPermission.request.operation.description),
    ).toBeVisible();
    await expect(
      canvas.getByText(argoPermission.request.operation.input),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Allow once' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'allow_once',
    });
  },
};
