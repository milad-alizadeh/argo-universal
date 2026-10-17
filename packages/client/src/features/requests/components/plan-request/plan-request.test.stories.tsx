import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, within } from 'storybook/test';
import { pickFromMenu } from '../../../../../mocks/requests/permission/option-menus.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { FilledSessionFrame } from '../../../../lib/product/session-fill.mocks';
import { PermissionRequest } from '../permission-request/permission-request';
import { planRequestProps, planTitleText } from './plan-request.mocks';

const meta = {
  title: 'Tests/PlanRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  render: (args): React.JSX.Element => (
    <FilledSessionFrame>
      <RequestFrame>
        <PermissionRequest {...args} />
      </RequestFrame>
    </FilledSessionFrame>
  ),
  args: planRequestProps({
    onAnswer: fn(),
    onBuildInNewSession: fn(),
    onSavePlan: fn(),
  }),
} satisfies Meta<typeof PermissionRequest>;

export default meta;

type Story = StoryObj<typeof meta>;

const planStep = 'Read README.md';

const canvas = (): ReturnType<typeof within> => within(document.body);

const button = (name: string): HTMLElement =>
  canvas().getByRole('button', { name, exact: true });

// Build sends the Agent's manual-approval option, so each edit still asks.
const builds = (width: number): Story => ({
  play: async ({ userEvent, args }) => {
    await settleViewport(width);
    await expect(canvas().getByText(planTitleText)).toBeVisible();
    await userEvent.click(button('Build'));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'exit-plan-default',
    });
  },
});

export const BuildPhone = builds(390);

export const BuildWide = builds(1440);

const keepsPlanning = (width: number): Story => ({
  play: async ({ userEvent, args }) => {
    await settleViewport(width);
    await userEvent.click(button('No, keep planning'));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'reject',
    });
  },
});

export const KeepPlanningPhone = keepsPlanning(390);

export const KeepPlanningWide = keepsPlanning(1440);

// The chevron picks how to build; pressing Build sends it.
export const BuildAutoAcceptWide: Story = {
  play: async ({ userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(button('Build options'));
    await pickFromMenu(userEvent, 'Build, auto-accept edits');
    await expect(args.onAnswer).not.toHaveBeenCalled();
    await userEvent.click(button('Build, auto-accept edits'));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'exit-plan-accept-edits',
    });
  },
};

// A new Session builds the plan; this one keeps planning.
export const BuildInNewSessionWide: Story = {
  play: async ({ userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(button('Build options'));
    await pickFromMenu(userEvent, 'Build in new Session');
    await userEvent.click(button('Build in new Session'));
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'reject',
    });
    await expect(args.onBuildInNewSession).toHaveBeenCalledTimes(1);
  },
};

// Show plan reads the plan in the card, its title drawn once in the header.
export const ShowPlanWide: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(1440);
    await expect(canvas().queryByText(planStep)).not.toBeInTheDocument();
    await userEvent.click(button('Show plan'));
    await expect(await canvas().findByText(planStep)).toBeVisible();
    await expect(canvas().getAllByText(planTitleText)).toHaveLength(1);
    await userEvent.click(button('Hide plan'));
    await expect(canvas().queryByText(planStep)).not.toBeInTheDocument();
  },
};

// Expand opens the plan full page; Restore brings the card back.
export const ExpandPlanWide: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(1440);
    await userEvent.click(button('Expand plan'));
    await expect(await canvas().findByText(planStep)).toBeVisible();
    await expect(button('Restore plan')).toBeVisible();
  },
};

export const SaveToWorkspaceWide: Story = {
  play: async ({ userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(button('Plan actions'));
    await userEvent.click(
      await canvas().findByRole('menuitem', { name: 'Save to workspace' }),
    );
    await expect(args.onSavePlan).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

// A phone opens the plan as the request sheet's next page.
export const ShowPlanPhone: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(390);
    await userEvent.click(button('Show plan'));
    await expect(await canvas().findByText(planStep)).toBeVisible();
  },
};
