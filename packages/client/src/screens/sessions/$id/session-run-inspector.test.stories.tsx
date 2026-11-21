import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { RunTerminal } from './run-terminal';
import { RunInspector } from './session-run-inspector';
import {
  outputText,
  recordRun,
  runActions,
  webRun,
} from './session-run-inspector-fixtures';

const typeInRun = fn();

const meta = {
  title: 'Tests/Screens/Sessions/Session/RunInspector',
  render: (): ReactElement => (
    <View className="h-[640px] w-frame-list">
      <RunInspector
        run={webRun}
        controls={{
          ...runActions,
          renderTerminal: (run) => (
            <RunTerminal
              run={run}
              connected
              listen={recordRun}
              onInput={typeInRun}
            />
          ),
        }}
      />
    </View>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReplaysOutputAndSendsKeystrokes: Story = {
  play: async ({ canvas, userEvent }) => {
    const terminal = within(
      canvas.getByRole('region', { name: 'web Terminal' }),
    );
    await expect(await terminal.findByText(outputText)).toBeVisible();

    const input = terminal.getByRole('textbox');
    input.focus();
    await userEvent.keyboard('r');

    await expect(typeInRun).toHaveBeenCalledWith('r');
    await expect(
      canvas.getByRole('link', { name: 'http://localhost:3100' }),
    ).toHaveAttribute('href', 'http://localhost:3100');
  },
};
