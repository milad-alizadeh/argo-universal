import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { SessionWorkbenchColumn } from './session-workbench';
import { WorkbenchMoreTasks, WorkbenchTasks } from './session-workbench-tasks';
import {
  failedShell,
  passedShell,
  runningShell,
  shellNow,
} from './shell-list/shell-list.mocks';

const shells = [runningShell, passedShell, failedShell];

function TasksCard(): ReactElement {
  const section = {
    key: 'shells',
    title: 'Background Tasks',
    summary: <WorkbenchTasks shells={shells} now={shellNow} onOpen={fn()} />,
    footer: <WorkbenchMoreTasks shells={shells} onOpen={fn()} />,
  };

  return (
    <View className="m-4 w-frame-list">
      <SessionWorkbenchColumn sections={[section]} />
    </View>
  );
}

const meta = {
  title: 'Tests/Sessions/SessionWorkbenchTasks',
  component: TasksCard,
} satisfies Meta<typeof TasksCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const footerName = 'Show 2 done';

export const SettledTasksLeadWithTheShellMark: Story = {
  play: async ({ canvas }) => {
    const footer = canvas.getByRole('button', { name: footerName });

    await expect(within(footer).getByText('2 done')).toBeVisible();
    await expect(footer.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

// A row reaches 4px past the card body's sides with its hover tile; the body's clip must leave that edge whole.
export const RowsReachPastTheBodyUnclipped: Story = {
  play: async ({ canvas }) => {
    const footer = canvas.getByRole('button', { name: footerName });
    const box = footer.getBoundingClientRect();
    const middle = box.top + box.height / 2;

    for (const x of [box.left + 1, box.right - 1])
      await expect(footer.contains(document.elementFromPoint(x, middle))).toBe(
        true,
      );
  },
};
