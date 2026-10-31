/// <reference types="@vitest/browser-playwright" />
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { cdp } from 'vitest/browser';
import { Feed } from './feed';
import {
  expandedAttribute,
  fullyInViewport,
  openedRow,
  openRow,
  readBackToSplitGroup,
  settleWait,
} from './feed-reader.mocks';
import { settledTopOf } from './feed-settled-top.mocks';
import {
  splitGroupFirstStepInTail,
  splitGroupLastStep,
  splitGroupRows,
} from './feed.mocks';
import { feedArgs, PagedFeed, sendOlderPage } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/GroupAtTop',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// The browser prefers reduced motion for one story, and no longer once it ends.
async function reduceMotion(): Promise<() => Promise<void>> {
  await cdp().send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });

  return async () => {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  };
}

// Resolves on the first animation frame where the condition holds.
function untilFrame(condition: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const frame = (): void => {
      if (condition()) resolve();
      else requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  });
}

// Read back to the top a screen at a time, the reader opens a group there: its header stays where it was and its rows open below it.
const keepsHeaderInPlaceWhenGroupOpensAtTop: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={splitGroupRows} holdOlderPages />
  ),
  play: async ({ canvas }) => {
    const { header } = await readBackToSplitGroup(canvas);
    const top = await settledTopOf(() => header);
    await openRow(header);
    // The group has opened down to its last command: until then its rows are still measuring and moving.
    await openedRow(header, () =>
      canvas.getByRole('button', { name: splitGroupLastStep }),
    );
    await expect(
      Math.abs((await settledTopOf(() => header)) - top),
    ).toBeLessThan(2);

    const step = await canvas.findByRole(
      'button',
      { name: splitGroupFirstStepInTail },
      settleWait,
    );

    await expect(step).toBeVisible();
    await expect(fullyInViewport(step)).toBe(true);
    await expect(step.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      header.getBoundingClientRect().bottom,
    );
    await expect(
      Math.abs(header.getBoundingClientRect().top - top),
    ).toBeLessThan(2);
  },
};

export const KeepsHeaderInPlaceWhenGroupOpensAtTop: Story =
  keepsHeaderInPlaceWhenGroupOpensAtTop;

// Under reduced motion the group opens in one step, and its header still stays where it was.
export const KeepsHeaderInPlaceWhenGroupOpensAtTopWithReducedMotion: Story = {
  ...keepsHeaderInPlaceWhenGroupOpensAtTop,
  beforeEach: reduceMotion,
};

// The reader opens the group and older rows join it before it has opened: its header stays where it was, and its first commands draw below it.
export const KeepsHeaderInPlaceWhenOlderRowsJoinAnOpeningGroup: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={splitGroupRows} holdOlderPages />
  ),
  play: async ({ canvas }) => {
    const { header } = await readBackToSplitGroup(canvas);
    const top = await settledTopOf(() => header);
    const group = header.parentElement;

    if (!group) throw new Error('No collapsible around the group header');
    const closedHeight = group.offsetHeight;
    header.click();
    // The first frame the group has grown, while it is still opening.
    await untilFrame(() => group.offsetHeight > closedHeight);
    sendOlderPage();

    const firstStep = await canvas.findByRole(
      'button',
      { name: 'Step 1' },
      settleWait,
    );

    await expect(
      Math.abs((await settledTopOf(() => header)) - top),
    ).toBeLessThan(2);
    await expect(header).toHaveAttribute(expandedAttribute, 'true');
    await expect(firstStep).toBeVisible();
    await expect(fullyInViewport(firstStep)).toBe(true);
    await expect(firstStep.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      header.getBoundingClientRect().bottom,
    );
  },
};
