import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { runIsActive, RunTerminal } from '#features/sessions';
import {
  partiallyReadyGroup,
  stoppedGroup,
  stoppedRuns,
  workbenchRuns,
} from '../../../../mocks/run-configurations';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { recordRun } from './session-run-inspector-fixtures';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

const start = fn<(name: string) => void>();

const stop = fn<(name: string) => void>();

const pressed = fn<(key: string) => Promise<void> | void>();

const resize = fn<(cols: number, rows: number) => void>();

const runs = {
  runs: workbenchRuns,
  onStart: start,
  onStop: stop,
  onRestart: fn(),
  renderTerminal: (run: (typeof workbenchRuns)[number]): ReactElement => (
    <RunTerminal
      name={run.name}
      interactive={runIsActive(run)}
      connected
      compact
      listen={recordRun}
      onInput={pressed}
      onResize={resize}
    />
  ),
};

const meta = {
  title: 'Tests/Screens/Sessions/Session/PhoneRuns',
  parameters: { screenPreview: true },
  decorators: [withStack()],
  beforeEach: (): Promise<void> => settleLayout('phone'),
  render: (): ReactElement => (
    <FramedSessionPreview state="open" {...idleSession} runs={runs} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ControlsRunsAndOpensTheTerminalInTheSheet: Story = {
  play: async (context) => {
    const sheet = await openPhoneRuns(context);

    const play = sheet.getByRole('button', { name: 'Start docs' });

    await settleOverlays(play);
    await context.userEvent.click(play);
    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Stop web' }),
    );

    await expect(start).toHaveBeenCalledWith('docs');
    await expect(stop).toHaveBeenCalledWith('web');

    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Open web Terminal' }),
    );

    await expect(
      await sheet.findByRole('heading', { name: 'web' }),
    ).toBeVisible();
    await expect(sheet.getByText('http://localhost:3100')).toBeVisible();
    await expect(
      sheet.queryByRole('link', { name: 'http://localhost:3100' }),
    ).toBeNull();

    await sendTerminalKeys(sheet, context.userEvent);
  },
};

const [webRun, docsRun] = workbenchRuns;

if (webRun?.status !== 'ready' || docsRun?.status !== 'stopped')
  throw new Error('Recorded catalog needs a ready Run and a stopped one.');

// The Runs section names each Run with its state, not a count, and a Run's row opens its Terminal.
export const ListsEachRunAndOpensItsTerminal: Story = {
  play: async (context) => {
    const sheet = await openWorkbench(context);

    const web = sheet.getByRole('link', {
      name: `${webRun.name}, Ready, :${webRun.port}`,
    });

    await expect(web).toBeVisible();
    await expect(within(web).queryByText('Ready')).not.toBeInTheDocument();
    await expect(
      sheet.getByRole('link', { name: `${docsRun.name}, Stopped` }),
    ).toBeVisible();
    await expect(sheet.queryByRole('link', { name: /^Runs\b/ })).toBeNull();

    await settleOverlays(web);
    await context.userEvent.click(web);

    await expect(
      await sheet.findByRole('heading', { name: webRun.name }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Back to Workbench' }),
    ).toBeVisible();
  },
};

const startGroup = fn<() => void>();

const stopGroup = fn<() => void>();

function WithDefaultGroup(): ReactElement {
  const [active, setActive] = useState(true);

  const group = {
    status: active ? partiallyReadyGroup : stoppedGroup,
    onStart: (): void => {
      startGroup();
      setActive(true);
    },
    onStop: (): void => {
      stopGroup();
      setActive(false);
    },
  };

  return (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      runs={{
        ...runs,
        runs: active ? workbenchRuns : stoppedRuns,
        defaultGroup: group,
      }}
    />
  );
}

export const StartsAndStopsTheDefaultGroupInTheSheet: Story = {
  render: (): ReactElement => <WithDefaultGroup />,
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const group = sheet.getByRole('link', { name: 'dev, Runs ready, 1 of 2' });

    await expect(within(group).getByText('1 of 2')).toBeVisible();
    await settleOverlays(group);
    await context.userEvent.click(group);

    await expect(
      await sheet.findByRole('heading', { name: 'Runs' }),
    ).toBeVisible();

    const stopButton = sheet.getByRole('button', { name: 'Stop dev group' });

    await settleOverlays(stopButton);
    await context.userEvent.click(stopButton);
    await expect(stopGroup).toHaveBeenCalledTimes(1);

    const startButton = await sheet.findByRole('button', {
      name: 'Start dev group',
    });

    await context.userEvent.click(startButton);
    await expect(startGroup).toHaveBeenCalledTimes(1);
    await expect(
      await sheet.findByRole('button', { name: 'Stop dev group' }),
    ).toBeVisible();
  },
};

async function openPhoneRuns(
  context: Parameters<NonNullable<Story['play']>>[0],
): Promise<Inside> {
  const sheet = await openWorkbench(context);
  const row = sheet.getByRole('link', { name: /^Manage Runs/ });

  await settleOverlays(row);
  await context.userEvent.click(row);

  await expect(
    await sheet.findByRole('heading', { name: 'Runs' }),
  ).toBeVisible();

  return sheet;
}

type Inside = ReturnType<typeof within>;

type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

async function sendTerminalKeys(sheet: Inside, userEvent: User): Promise<void> {
  const region = within(
    await sheet.findByRole('region', { name: 'web Terminal' }),
  );

  const keys = within(region.getByRole('toolbar', { name: 'Terminal keys' }));
  const escape = keys.getByRole('button', { name: 'Esc' });

  const firstSend = Promise.withResolvers<void>();

  pressed.mockImplementationOnce(() => firstSend.promise);

  try {
    await settleOverlays(escape);
    await userEvent.click(escape);
    await waitFor(() => expect(pressed).toHaveBeenCalledWith('\u001b'));
    await userEvent.keyboard('a');
    await userEvent.click(keys.getByRole('button', { name: 'Ctrl' }));
    await userEvent.keyboard('c');
    await userEvent.click(keys.getByRole('button', { name: 'Tab' }));
    await userEvent.click(keys.getByRole('button', { name: '↑' }));
  } finally {
    firstSend.resolve();
  }

  await waitFor(() =>
    // Keys pressed while the first is in flight go together, in order.
    expect(pressed.mock.calls).toEqual([['\u001b'], ['a\u0003\t\u001b[A']]),
  );
}
