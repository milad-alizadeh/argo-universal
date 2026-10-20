import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { longRunningOutput } from './shell-list.mocks';
import outputMeta from './shell-output.stories';

const meta = { ...outputMeta, title: 'Tests/ShellOutput' };

export default meta;

type Story = StoryObj<typeof meta>;

const awayWait = { timeout: 15000, interval: 100 };

// The wheel turning up stops the list following its end, which setting scrollTop alone does not.
function scrollUp(scroll: HTMLElement): void {
  scroll.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
  );
  scroll.scrollTop = 0;
  scroll.dispatchEvent(new Event('scroll'));
}

// Scrolling up offers Jump to latest, which goes back to the end and hides itself.
export const JumpsBackToTheEnd: Story = {
  args: { output: longRunningOutput },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId('shell-output');
    await waitFor(async () => {
      scrollUp(scroll);
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, awayWait);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Jump to latest' }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
};

export const ShowsTheCommandAndFolder: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('$')).toBeVisible();
    await expect(canvas.getByText('~/argo-universal/apps/app')).toBeVisible();
    await expect(canvas.queryByText(/^after /)).toBeNull();
  },
};
