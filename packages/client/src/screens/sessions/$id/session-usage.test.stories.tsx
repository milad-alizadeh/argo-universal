import type { ContextUsage } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, within, waitFor } from 'storybook/test';
import { composerStatus } from '#features/sessions';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { SessionDetailView } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/SessionUsage',
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

const contextRing = (width: number, level: ContextLevel): Story => ({
  render: renderUsage(level.usage),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);
    const trigger = canvas.getByRole('button', { name: contextLabel });
    const inlineTokens = within(trigger).getByText(level.used);

    if (width === layoutWidths.wide) await expect(inlineTokens).toBeVisible();
    else await expect(inlineTokens).not.toBeVisible();

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

const hidden = (width: number, usage: ContextUsage | undefined): Story => ({
  render: renderUsage(usage),
  play: async ({ canvas }) => {
    await settleViewport(width);
    await expect(
      canvas.queryByRole('button', { name: contextLabel }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
  },
});

export const LowDesktop = contextRing(layoutWidths.wide, low);

export const LowPhone = contextRing(layoutWidths.phone, low);

export const HighDesktop = contextRing(layoutWidths.wide, high);

export const HighPhone = contextRing(layoutWidths.phone, high);

export const FullDesktop = contextRing(layoutWidths.wide, full);

export const FullPhone = contextRing(layoutWidths.phone, full);

export const PartialDesktop = hidden(layoutWidths.wide, {
  ...low.usage,
  scope: 'model-call',
});

export const PartialPhone = hidden(layoutWidths.phone, {
  ...low.usage,
  scope: 'model-call',
});

export const MissingDesktop = hidden(layoutWidths.wide, undefined);

export const MissingPhone = hidden(layoutWidths.phone, undefined);
