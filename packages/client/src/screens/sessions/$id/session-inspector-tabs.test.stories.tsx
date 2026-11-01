import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { runningSubagent } from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { OverflowingInspector } from './session-inspector.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/InspectorTabs',
  render: (): JSX.Element => <OverflowingInspector />,
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const changesList = 'changes-files';

type Named = { name: string };

const fileHeader = (path: string): Named => ({ name: `Diff for ${path}` });

const firstFile = '/repo/src/module-1/index.ts';

// Hidden tab pages stay mounted, so the Changes list keeps its scroll and its folded files.
export const RemembersListPositionAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    const list = within(
      await canvas.findByRole('tabpanel', { name: 'Changes' }),
    ).getByTestId(changesList);

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
          changesList,
        ).scrollTop,
        'restored scroll',
      ).toBeGreaterThan(400),
    );
  },
};

export const RemembersFoldedFilesAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', fileHeader(firstFile)),
    );
    await expect(
      canvas.getByRole('button', fileHeader(firstFile)),
    ).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    // The returning panel turns visible with its rows mid-transition, hidden to assistive queries until the next frame.
    await expect(
      await canvas.findByRole('button', fileHeader(firstFile)),
    ).toHaveAttribute('aria-expanded', 'false');
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

const backToAgents = 'Back to Agents';

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

export const KeepsComparisonAboveScrollingFiles: Story = {
  play: async ({ canvas }) => {
    const page = within(
      await canvas.findByRole('tabpanel', { name: 'Changes' }),
    );

    const comparison = page.getByRole('button', {
      name: /^Comparison/,
    });

    const files = page.getByTestId(changesList);

    const top = comparison.getBoundingClientRect().top;

    files.scrollTop = 500;
    await fireEvent.scroll(files);
    await waitFor(() => expect(files.scrollTop).toBeGreaterThan(400));
    await expect(comparison).toBeVisible();
    await expect(comparison.getBoundingClientRect().top).toBe(top);
    await expect(comparison.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      files.getBoundingClientRect().top,
    );
  },
};
