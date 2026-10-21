import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type JSX } from 'react';
import { View } from 'react-native';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { useSessionPanels } from '#features/sessions';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import {
  changesArgs,
  manyFiles,
} from '../../../features/frame/components/changes-inspector/changes-inspector.mocks';
import {
  sessionShells,
  shellNow,
} from '../../../features/sessions/components/shell-list/shell-list.mocks';
import { SessionInspector } from './session-inspector';

function Stage(): JSX.Element {
  const panels = useSessionPanels(['changes', 'shells']);
  const [opened, setOpened] = useState(false);

  if (!opened) {
    panels.select('shells');
    panels.select('changes');
    setOpened(true);
  }

  return (
    <View className="h-150 flex-row">
      <SessionInspector
        panels={panels}
        changes={{ ...changesArgs, files: manyFiles }}
        shells={{ shells: sessionShells, now: shellNow, onStop: fn() }}
      />
    </View>
  );
}

const meta = {
  title: 'Tests/SessionInspectorStage',
  render: (): JSX.Element => <Stage />,
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const RemembersListPositionAcrossTabs: Story = {
  play: async ({ canvas, userEvent }) => {
    const list = await canvas.findByTestId('desktop-inspector-scroll');

    list.scrollTop = 500;
    await fireEvent.scroll(list);
    await waitFor(() =>
      expect(list.scrollTop, 'initial scroll').toBeGreaterThan(400),
    );
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector-scroll').scrollTop,
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
