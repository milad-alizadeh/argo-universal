import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PermissionRequest } from '../../../src/features/requests/components/permission-request/permission-request';
import { permissionProps } from '../../../src/features/requests/components/request.mocks';
import { RequestFrame } from '../../../src/lib/product/request-frame';

export const allowOnceLabel = 'Allow once';

export const allowedOnceAnswer = 'You allowed this once';

export const allowOptions = 'Allow options';

export const rejectOptions = 'Reject options';

export const alwaysReject = 'Always Reject';

export const meta: Meta<typeof PermissionRequest> = {
  title: 'Tests/Requests/PermissionRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  render: (args) => (
    <RequestFrame>
      <PermissionRequest {...permissionProps(args)} />
    </RequestFrame>
  ),
  args: { ...permissionProps({}), onAnswer: fn() },
};

export type Story = StoryObj<typeof meta>;
