import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import {
  type OpenSessionViewProps,
  SessionView,
  type SessionViewProps,
} from './session-view';
import {
  DetailHeaderSlots,
  emptySession,
  idleSession,
  runningHeader,
  runningSession,
} from './session-view.mocks';

const cancelCreationLabel = 'Cancel creation';
const agentFailure = 'The Agent stopped three times in ten minutes';

const meta = {
  title: 'Tests/SessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => (
    <DetailHeaderSlots>
      <SessionView {...view} />
    </DetailHeaderSlots>
  ),
} satisfies Meta<{ view: SessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

function openProps(view: SessionViewProps): OpenSessionViewProps {
  if (view.state !== 'open')
    throw new Error('The story needs an open Session.');
  return view;
}

function retryOf(view: SessionViewProps): () => void {
  if (view.state !== 'open-failed' && view.state !== 'load-failed')
    throw new Error('The story needs a failed Session.');
  return view.onRetry;
}

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', { name: /^Think briefly first/ }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Running')).toBeVisible();
        await expect(canvas.getByText('for 4m 12s')).toBeVisible();
      } else {
        // The native header holds the plain title and two items, no status.
        await expect(
          canvas.getByRole('button', { name: 'Changes' }),
        ).toBeVisible();
        await expect(canvas.queryByText('Running')).toBeNull();
      }
      await expect(canvas.getByRole('button', { name: 'More' })).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
      // A running Turn is no Session to cancel.
      await expect(
        canvas.queryByRole('button', { name: cancelCreationLabel }),
      ).toBeNull();
    }),
};

export const StopsTheTurn: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(await canvas.findByRole('button', { name: 'Stop' }));
    await expect(openProps(args.view).composer.onStop).toHaveBeenCalledOnce();
  },
};

export const Idle: Story = {
  args: { view: { state: 'open', ...idleSession } },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Idle')).toBeVisible();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
    }),
};

export const EmptyFeed: Story = {
  args: { view: { state: 'open', ...emptySession } },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId('feed-scroll')).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: cancelCreationLabel }),
      ).toBeVisible();
    }),
};

export const CancelsCreation: Story = {
  args: { view: { state: 'open', ...emptySession } },
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: cancelCreationLabel }),
    );
    await expect(
      openProps(args.view).cancelCreation.onCancel,
    ).toHaveBeenCalledOnce();
  },
};

export const Disconnected: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      composer: {
        ...idleSession.composer,
        draft: { text: 'Keep this while offline', images: [] },
        sendable: false,
      },
    },
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    }),
};

export const Opening: Story = {
  args: { view: { state: 'opening' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

export const AgentFailedToOpen: Story = {
  args: {
    view: { state: 'open-failed', message: agentFailure, onRetry: fn() },
  },
  play: async ({ canvas, args, userEvent }) => {
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent("Couldn't open the Session");
    await expect(alert).toHaveTextContent(agentFailure);
    // A Session that failed to open takes no prompt.
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await expect(retryOf(args.view)).toHaveBeenCalledOnce();
  },
};

export const FailedToLoad: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent("Couldn't load the Session");
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await expect(retryOf(args.view)).toHaveBeenCalledOnce();
  },
};

// A started Session's Agent became unavailable: its row says why and Retry asks again.
function agentUnavailable(agentIndex: 0 | 1): Story {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  if (!agent?.installStep)
    throw new Error('Recorded catalog needs two unavailable Agents.');
  const { installStep } = agent;
  const configuration = idleSession.composer.configuration;
  if (!configuration) throw new Error('Idle Session has no configuration.');
  return {
    args: {
      view: {
        state: 'open',
        ...idleSession,
        composer: {
          ...idleSession.composer,
          configuration: {
            ...configuration,
            agents: newSessionCatalogs.bothUnavailable,
            agent: agent.agent,
            configOptions: agent.configOptions,
            onAgentRetry: fn(),
          },
        },
      },
    },
    play: async ({ canvas, args, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      const overlay = within(document.body);
      const row = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(row).toBeVisible());
      await expect(row).toBeDisabled();
      await expect(within(row).getByText(installStep)).toBeVisible();
      await userEvent.click(
        overlay.getByRole('button', { name: `Retry ${agent.label}` }),
      );
      await expect(
        openProps(args.view).composer.configuration?.onAgentRetry,
      ).toHaveBeenCalledOnce();
    },
  };
}

export const AgentUnavailableFirstAgent = agentUnavailable(0);
export const AgentUnavailableSecondAgent = agentUnavailable(1);

// The Session's own Agent shows in the Composer's picker, and a started Session keeps it.
function configuration(agentIndex: 0 | 1): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  const base = idleSession.composer.configuration;
  if (!agent || !base) throw new Error('Recorded catalog needs two Agents.');
  return {
    args: {
      view: {
        state: 'open',
        ...idleSession,
        composer: {
          ...idleSession.composer,
          configuration: {
            ...base,
            agent: agent.agent,
            configOptions: agent.configOptions,
          },
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const trigger = await canvas.findByRole('button', {
        name: 'Agent and model',
      });
      await userEvent.click(trigger);
      const overlay = within(document.body);
      const current = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(current).toBeVisible());
      // A started Session keeps its Agent.
      await expect(current).toBeDisabled();
    },
  };
}

export const ConfigurationFirstAgent = configuration(0);
export const ConfigurationSecondAgent = configuration(1);
