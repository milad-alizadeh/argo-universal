import { terminalColumns } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  RunInspector,
  RunTerminal,
  type RunOutputSource,
} from '#features/sessions';
import {
  outputText,
  recordRun,
  runActions,
  webRun,
} from './session-run-inspector-fixtures';

const terminalRegion = { name: 'web Terminal' };

const typeInRun = fn<(input: string) => Promise<void> | void>();

const resizeRun = fn<(columns: number, rows: number) => void>();

const meta = {
  title: 'Tests/Screens/Sessions/Session/RunInspector',
  render: (): ReactElement => (
    <View className="h-160 w-frame-list">
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
              onResize={resizeRun}
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
    const terminal = within(canvas.getByRole('region', terminalRegion));

    await waitFor(() => expect(terminal.getByText(outputText)).toBeVisible());

    const input = terminal.getByRole('textbox');
    input.focus();

    await userEvent.keyboard('r');

    await expect(typeInRun).toHaveBeenCalledWith('r');
    await expect(
      canvas.getByRole('link', { name: 'http://localhost:3100' }),
    ).toHaveAttribute('href', 'http://localhost:3100');
  },
};

export const FitsTheViewportAndWaitsForTheEarlierKeystroke: Story = {
  play: async ({ canvas, userEvent }) => {
    const firstSend = Promise.withResolvers<void>();

    typeInRun.mockClear();
    typeInRun.mockImplementationOnce(() => firstSend.promise);

    const terminal = within(canvas.getByRole('region', terminalRegion));

    const input = terminal.getByRole('textbox');

    await waitFor(async () => {
      const dimensions = resizeRun.mock.lastCall;

      await expect(dimensions?.[0]).toBeLessThan(terminalColumns);
      await expect(dimensions?.[1]).toBeGreaterThan(0);
    });
    input.focus();

    await userEvent.keyboard('rs');

    await expect(typeInRun.mock.calls).toEqual([['r']]);

    firstSend.resolve();

    await waitFor(() => expect(typeInRun.mock.calls).toEqual([['r'], ['s']]));
  },
};

const resumedText = 'Connection restored';

const replay = fn<RunOutputSource>((cursor, receive) => {
  // A socket can replay the original response before delivering new bytes.
  const stop = recordRun(undefined, receive);

  if (cursor)
    receive({
      cursor: { ...cursor, offset: cursor.offset + resumedText.length },
      data: btoa(resumedText),
    });

  return stop;
});

function ReconnectTerminal(): ReactElement {
  const [connected, setConnected] = useState(true);

  return (
    <View className="h-160 w-frame-list">
      <Button
        label={connected ? 'Disconnect' : 'Reconnect'}
        onPress={() => setConnected(!connected)}
      />
      <RunTerminal
        run={webRun}
        connected={connected}
        listen={replay}
        onInput={typeInRun}
        onResize={resizeRun}
      />
    </View>
  );
}

export const ResumesWithoutRepeatingTheRecording: Story = {
  render: ReconnectTerminal,
  play: async ({ canvas, userEvent }) => {
    const terminal = within(canvas.getByRole('region', terminalRegion));

    await terminal.findByText(outputText);
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Reconnect' }));

    await expect(await terminal.findByText(resumedText)).toBeVisible();
    await expect(terminal.getAllByText(outputText)).toHaveLength(1);
  },
};
