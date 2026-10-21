import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { runningSubagent } from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { Stage } from './session-inspector-stage.test.mocks';

const meta = {
  title: 'Tests/SessionInspectorStage',
  render: (): JSX.Element => <Stage />,
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const RemembersListPositionAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    const list = within(
      await canvas.findByRole('tabpanel', { name: 'Changes' }),
    ).getByTestId('desktop-inspector-scroll');

    list.scrollTop = 500;
    await fireEvent.scroll(list);
    await waitFor(() =>
      expect(list.scrollTop, 'initial scroll').toBeGreaterThan(400),
    );
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await waitFor(() =>
      expect(
        within(canvas.getByRole('tabpanel', { name: 'Changes' })).getByTestId(
          'desktop-inspector-scroll',
        ).scrollTop,
        'restored scroll',
      ).toBeGreaterThan(400),
    );
  },
};

export const RemembersFileDetailAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: 'Diff for /repo/src/module-1/index.ts',
      }),
    );
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible();
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(
      canvas.queryByRole('button', {
        name: 'Diff for /repo/src/module-2/index.ts',
      }),
    ).toBeNull();
  },
};

export const RemembersShellDetailAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: /Shells/ }));
    await userEvent.click(
      await canvas.findByRole('button', { name: /^pnpm dev,/ }),
    );
    await expect(
      canvas.getByRole('button', { name: backToShells }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await expect(
      canvas.getByRole('button', { name: backToShells }),
    ).toBeVisible();
    await expect(canvas.getByTestId('shell-output')).toBeVisible();
  },
};

const backToShells = 'Back to Shells';

const backToAgents = 'Back to Subagents';

export const RemembersAgentDetailAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: /Agents/ }));
    await userEvent.click(
      await canvas.findByRole('button', {
        name: new RegExp(`^${runningSubagent.title},`),
      }),
    );
    await expect(
      canvas.getByRole('button', { name: backToAgents }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await userEvent.click(canvas.getByRole('tab', { name: /Agents/ }));
    await expect(
      canvas.getByRole('button', { name: backToAgents }),
    ).toBeVisible();
    await expect(
      canvas.getAllByText(/^Use apply_patch to change beta to gamma/)[0],
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: backToAgents }));
    await expect(
      canvas.getByRole('button', {
        name: new RegExp(`^${runningSubagent.title},`),
      }),
    ).toBeVisible();
  },
};
