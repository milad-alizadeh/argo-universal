import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { PermissionRequest } from '../permission-request/permission-request';
import { planRequestProps } from './plan-request.mocks';

const meta = {
  title: 'Requests/PlanRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  render: (args): React.JSX.Element => (
    <RequestFrame>
      <PermissionRequest {...args} />
    </RequestFrame>
  ),
  args: planRequestProps(),
} satisfies Meta<typeof PermissionRequest>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlanRequest = {} satisfies Story;

export const Sending = {
  args: planRequestProps({ state: { kind: 'submitting' } }),
} satisfies Story;
