import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { runningSubagent } from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { Stage } from './session-inspector-stage.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/InspectorScroll',
  render: (): JSX.Element => <Stage />,
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function remembersSectionList(name: RegExp, label: string): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(await canvas.findByRole('tab', { name }));
      const page = within(canvas.getByRole('tabpanel', { name: label }));
      const scroll = page.getByTestId('desktop-inspector-scroll');

      scroll.scrollTop = 500;
      await fireEvent.scroll(scroll);
      await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(400));
      await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
      await expect(
        canvas.getByRole('tabpanel', { name: 'Changes' }),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('tab', { name }));
      await expect(
        page.getByTestId('desktop-inspector-scroll').scrollTop,
      ).toBeGreaterThan(400);
    },
  };
}

export const RemembersShellListPosition = remembersSectionList(
  /Shells/,
  'Shells',
);

export const RemembersAgentListPosition = remembersSectionList(
  /Agents/,
  'Agents',
);

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const shellOutputOffset = 100;

function scrollOutputUp(output: HTMLElement): void {
  output.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -output.clientHeight }),
  );
  output.scrollTop = shellOutputOffset;
  output.dispatchEvent(new Event('scroll'));
}

// The output initially follows latest; wait until the reader has actually left it.
async function readEarlierOutput(
  output: HTMLElement,
  canvas: Canvas,
): Promise<void> {
  await waitFor(async () => {
    scrollOutputUp(output);
    await expect(
      canvas.getByRole('button', { name: 'Jump to latest' }),
    ).toBeVisible();
    await expect(output.scrollTop).toBeCloseTo(shellOutputOffset, 0);
  });
}

export const RemembersShellOutputPosition: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: /Shells/ }));
    await userEvent.click(
      await canvas.findByRole('button', { name: /^pnpm dev,/ }),
    );
    const output = await canvas.findByTestId('shell-output');

    await waitFor(() =>
      expect(output.scrollHeight).toBeGreaterThan(output.clientHeight),
    );
    await readEarlierOutput(output, canvas);
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await expect(
      canvas.queryByRole('button', { name: 'Back to Shells' }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('tab', { name: /Shells/ }));
    await expect(
      canvas.getByRole('button', { name: 'Back to Shells' }),
    ).toBeVisible();
    await expect(canvas.getByTestId('shell-output').scrollTop).toBeCloseTo(
      shellOutputOffset,
      0,
    );
  },
};

export const RemembersAgentFeedPosition: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: /Agents/ }));
    await userEvent.click(
      await canvas.findByRole('button', {
        name: new RegExp(`^${runningSubagent.title},`),
      }),
    );
    const feed = await canvas.findByTestId('feed-scroll');

    await waitFor(() =>
      expect(feed.scrollHeight).toBeGreaterThan(feed.clientHeight),
    );
    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -feed.clientHeight }));
    feed.scrollTop = 10;
    await fireEvent.scroll(feed);
    await waitFor(() => expect(feed.scrollTop).toBeCloseTo(10, 0));
    await userEvent.click(canvas.getByRole('tab', { name: 'Changes' }));
    await expect(
      canvas.queryByRole('button', { name: 'Back to Subagents' }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('tab', { name: /Agents/ }));
    await expect(
      canvas.getByRole('button', { name: 'Back to Subagents' }),
    ).toBeVisible();
    await expect(canvas.getByTestId('feed-scroll').scrollTop).toBeCloseTo(
      10,
      0,
    );
  },
};
