import type { ContextUsage } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, within, waitFor } from 'storybook/test';
import { composerStatus } from '#features/sessions';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { SessionView } from './session-view';
import { idleSession } from './session-view.mocks';

const meta = {
  title: 'Tests/SessionUsage',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <SessionView state="open" {...idleSession} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const contextLabel = 'Context window';

const indicator = (
  width: number,
  usage: ContextUsage | undefined,
  shown: boolean,
): Story => ({
  render: (): React.JSX.Element => (
    <SessionView
      state="open"
      {...idleSession}
      composer={{
        ...idleSession.composer,
        status: composerStatus(null, usage),
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);

    if (!shown) {
      await expect(
        canvas.queryByRole('button', { name: contextLabel }),
      ).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();

      return;
    }

    await userEvent.click(canvas.getByRole('button', { name: contextLabel }));
    const panel = within(document.body);
    await waitFor(() => expect(panel.getByText('/ 200k tokens')).toBeVisible());
    await expect(panel.getAllByText('34k').at(-1)).toBeVisible();
    await expect(panel.queryByText('Turn usage')).not.toBeInTheDocument();
    await expect(panel.queryByText('Thought')).not.toBeInTheDocument();
  },
});

export const MeasuredDesktop = indicator(
  layoutWidths.wide,
  { used: 34_000, size: 200_000 },
  true,
);

export const MeasuredPhone = indicator(
  layoutWidths.phone,
  { used: 34_000, size: 200_000 },
  true,
);

export const PartialDesktop = indicator(
  layoutWidths.wide,
  { used: 34_000, size: 200_000, scope: 'model-call' },
  false,
);

export const PartialPhone = indicator(
  layoutWidths.phone,
  { used: 34_000, size: 200_000, scope: 'model-call' },
  false,
);

export const MissingDesktop = indicator(layoutWidths.wide, undefined, false);

export const MissingPhone = indicator(layoutWidths.phone, undefined, false);
