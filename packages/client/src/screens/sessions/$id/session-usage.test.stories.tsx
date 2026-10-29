import type { ContextUsage } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, within, waitFor } from 'storybook/test';
import { composerStatus } from '#features/sessions';
import { SessionDetailView } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Usage',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <SessionDetailView state="open" {...idleSession} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const contextLabel = 'Context window';

const renderUsage =
  (usage: ContextUsage | undefined) => (): React.JSX.Element => (
    <SessionDetailView
      state="open"
      {...idleSession}
      composer={{
        ...idleSession.composer,
        status: composerStatus(null, usage),
      }}
    />
  );

interface ContextLevel {
  usage: ContextUsage;
  used: string;
  size: string;
  percent: number;
  zone: 'Smart zone' | 'Dumb zone';
}

const low: ContextLevel = {
  usage: { used: 34_000, size: 200_000 },
  used: '34k',
  size: '200k',
  percent: 17,
  zone: 'Smart zone',
};

const high: ContextLevel = {
  usage: { used: 170_000, size: 200_000 },
  used: '170k',
  size: '200k',
  percent: 85,
  zone: 'Dumb zone',
};

const full: ContextLevel = {
  usage: { used: 200_000, size: 200_000 },
  used: '200k',
  size: '200k',
  percent: 100,
  zone: 'Dumb zone',
};

const contextRing = (
  width: number,
  level: ContextLevel,
  inlineTokens: boolean,
): Story => ({
  render: renderUsage(level.usage),
  play: async ({ canvas, userEvent }) => {
    await settleLayout(width);
    const trigger = canvas.getByRole('button', { name: contextLabel });
    const summary = `${level.used} / ${level.size}`;
    await (inlineTokens
      ? expect(trigger).toHaveTextContent(summary)
      : expect(trigger).not.toHaveTextContent(level.used));

    await userEvent.click(trigger);
    const panel = within(await within(document.body).findByRole('dialog'));
    await waitFor(() =>
      expect(panel.getByText(`/ ${level.size} tokens`)).toBeVisible(),
    );
    await expect(panel.getByText(level.used)).toBeVisible();
    await expect(
      panel.getByText(`${level.percent}% · ${level.zone}`),
    ).toBeVisible();
    await expect(panel.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(level.percent),
    );
    await expect(panel.queryByText('Turn usage')).not.toBeInTheDocument();
    await expect(panel.queryByText('Thought')).not.toBeInTheDocument();
  },
});

const hidden = (width: number, usage?: ContextUsage): Story => ({
  render: renderUsage(usage),
  play: async ({ canvas }) => {
    await settleLayout(width);
    await expect(
      canvas.queryByRole('button', { name: contextLabel }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
  },
});

export const LowDesktop = contextRing(layoutWidths.wide, low, true);

export const LowPhone = contextRing(layoutWidths.phone, low, false);

export const HighDesktop = contextRing(layoutWidths.wide, high, true);

export const HighPhone = contextRing(layoutWidths.phone, high, false);

export const FullDesktop = contextRing(layoutWidths.wide, full, true);

export const FullPhone = contextRing(layoutWidths.phone, full, false);

export const PartialDesktop = hidden(layoutWidths.wide, {
  ...low.usage,
  scope: 'model-call',
});

export const PartialPhone = hidden(layoutWidths.phone, {
  ...low.usage,
  scope: 'model-call',
});

export const MissingDesktop = hidden(layoutWidths.wide);

export const MissingPhone = hidden(layoutWidths.phone);
