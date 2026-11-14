import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import {
  feedScrollId,
  scrollAwayFromEnd,
  scrolledToEnd,
} from '../../../features/feed/components/feed/feed-reader.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  changedLongSession,
  changedSession,
  cleanSession,
  unreadSession,
} from './session-detail-view-changes-pill.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesPill',
  parameters: { screenPreview: true },
  args: { view: changedSession },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const pillName = {
  name: 'Changes, 24 files, 12,000 lines added, 400 removed',
};

const anyPill = { name: /^Changes, / };

const centre = (box: DOMRect): number => box.left + box.width / 2;

// A wide window's press selects the Inspector's Changes tab; a phone's opens the Changes sheet.
export const OpensTheInspectorChangesTabWide: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(await canvas.findByRole('button', pillName));
    await expect(
      await canvas.findByRole('tab', { name: 'Changes' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('tabpanel', { name: 'Changes' }),
    ).toBeVisible();
  },
};

export const OpensTheChangesSheetOnPhone: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole('dialog', { name: 'Changes' })).toBeNull();
    await userEvent.click(await canvas.findByRole('button', pillName));
    await expect(
      await screen.findByRole('dialog', { name: 'Changes' }),
    ).toBeVisible();
  },
};

// With no changed files, or before the Checkout's changes are known, the Composer has no pill.
function hiddenWith(view: SessionDetailViewProps): Story {
  return {
    args: { view },
    play: async ({ canvas }) => {
      await canvas.findByRole('textbox');
      await expect(canvas.queryByRole('button', anyPill)).toBeNull();
    },
  };
}

export const HiddenWithNoChanges = hiddenWith(cleanSession);

export const HiddenUntilTheChangesAreKnown = hiddenWith(unreadSession);

// Jump to latest keeps one gap above the pill, and the pill one gap above the Composer.
export const SitsBelowJumpToLatest: Story = {
  args: { view: changedLongSession },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    const pill = await canvas.findByRole('button', pillName);
    await expect(
      canvas.queryByRole('button', { name: /^Jump to latest/ }),
    ).toBeNull();
    const withoutJump = pill.getBoundingClientRect();

    await scrollAwayFromEnd(canvas, scroll);
    const jump = await canvas.findByRole('button', { name: 'Jump to latest' });

    const composer = canvas
      .getByTestId('composer-column')
      .getBoundingClientRect();

    // The pill does not move for Jump to latest, and the two never overlap.
    await expect(pill.getBoundingClientRect().top).toBeCloseTo(
      withoutJump.top,
      0,
    );
    await expect(jump.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      withoutJump.top,
    );
    await expect(withoutJump.bottom).toBeLessThanOrEqual(composer.top);
    await expect(centre(jump.getBoundingClientRect())).toBeCloseTo(
      centre(withoutJump),
      0,
    );
  },
};
