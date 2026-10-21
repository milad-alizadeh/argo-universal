import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, screen, within, waitFor } from 'storybook/test';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  severalPullRequests,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchChanges',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, severalPullRequests),
    },
  },
  render: ({ view }): ReactElement => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleViewport(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const firstChange = { name: 'Open Change #45' };

type Context = Parameters<NonNullable<Story['play']>>[0];

async function expectPrDetails({
  canvas,
}: Pick<Context, 'canvas'>): Promise<void> {
  const stage = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

  await expect(await stage.findByLabelText(firstChange.name)).toBeVisible();
}

export const BoundedPreview: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', firstChange)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Open Change #44' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Open Change #43' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Open Change #46' }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: 'Open Change #42' }),
    ).toBeNull();
    await expect(
      canvas.getByText('1 more open, 1 merged, 1 closed'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 4/5, 1 failing'),
    ).toBeVisible();
    await expect(canvas.getByLabelText('CI Checks 5/5, passed')).toBeVisible();
  },
};

export const DisclosureKeepsStageClosed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Collapse Changes' }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstChange)).toBeNull(),
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Changes' }),
    );
    await expect(canvas.getByRole('button', firstChange)).toBeVisible();
  },
};

export const MenuOpensStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Change #45 actions' }),
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Open Changes in Stage' }),
    );
    await expectPrDetails({ canvas });
  },
};

export const RemainderOpensStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: '1 more open, 1 merged, 1 closed',
      }),
    );
    await expectPrDetails({ canvas });
  },
};

export const RowOpensStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', firstChange));
    await expectPrDetails({ canvas });
  },
};

export const PreviewRestoresPrDetails: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', firstChange));
    await expectPrDetails({ canvas });
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await userEvent.click(canvas.getByRole('button', firstChange));
    await expectPrDetails({ canvas });
  },
};
