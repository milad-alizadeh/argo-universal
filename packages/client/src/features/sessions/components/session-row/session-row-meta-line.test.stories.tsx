import { settleLayout } from '@repo/kit/mocks/story-layout';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { SessionRow } from './session-row';
import {
  checkoutChangesPullRequestSession,
  checkoutChangesSession,
  checkoutChangesShellSession,
  checkoutNoLinesSession,
  issueItem,
} from './session-row-fixtures';
import { crowdedMetaSession } from './session-row-pull-request-fixtures';

const meta = {
  ...sessionRowTestMeta,
  title: 'Tests/Sessions/SessionRow/MetaLine',
};

export default meta;

const moreItems = { name: /^\d+ more items?$/ };

// The copy a reader sees: a crowded line also draws its parts unseen, at no opacity, to measure them.
function shown(elements: HTMLElement[]): HTMLElement {
  const visible = elements.find((element) =>
    element.checkVisibility({ opacityProperty: true }),
  );

  if (!visible) throw new Error('No copy is shown');

  return visible;
}

const rightOf = (element: Element): number =>
  element.getBoundingClientRect().right;

/*
 * A sidebar row too narrow for every part: what fits shows whole, "+N" ends the line after Argo's own parts, and a
 * pointer resting on it lists the Plugin items that did not fit, by glyph and text alone.
 */
export const CrowdedEndsOnMore: Story = {
  args: crowdedMetaSession,
  render: (args) => (
    <View style={{ width: 230 }}>
      <SessionRow {...args} />
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const more = await waitFor(() => canvas.getByRole('button', moreItems));
    const agents = shown(canvas.getAllByLabelText('Agents: 4 running'));

    await expect(rightOf(more)).toBeGreaterThan(rightOf(agents));
    await userEvent.hover(more);

    const list = await within(document.body).findByRole('dialog');

    await waitFor(() =>
      expect(within(list).getByText(issueItem.item.text)).toBeVisible(),
    );
    await expect(
      within(list).queryByText(issueItem.pluginName),
    ).not.toBeInTheDocument();
  },
};

const additions = '+128';

const deletions = '\u221214';

// The Checkout's totals stand in a Change's place on the line, ahead of a running Shell's count.
export const CheckoutTotalsLeadTheLine: Story = {
  args: checkoutChangesShellSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const added = await canvas.findByText(additions);
    const shells = canvas.getByLabelText(/^Background Tasks: 1 running/);

    await expect(canvas.getByText(deletions)).toBeVisible();
    await expect(added.getBoundingClientRect().right).toBeLessThan(
      shells.getBoundingClientRect().left,
    );
  },
};

// A Change replaces the totals; the row never draws both.
export const ChangeReplacesCheckoutTotals: Story = {
  args: checkoutChangesPullRequestSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(
      await canvas.findByTestId('session-pull-request-slot'),
    ).toBeVisible();
    await expect(canvas.queryByText(additions)).not.toBeInTheDocument();
    await expect(canvas.queryByText(deletions)).not.toBeInTheDocument();
  },
};

// Totals of no lines draw nothing.
export const NoLinesDrawNothing: Story = {
  args: checkoutNoLinesSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(canvas.getByRole('button')).toBeVisible();
    await expect(
      canvas.queryByTestId('session-changes-slot'),
    ).not.toBeInTheDocument();
  },
};

// Totals alone draw on the line.
export const CheckoutTotalsDraw: Story = {
  args: checkoutChangesSession,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(await canvas.findByText(additions)).toBeVisible();
  },
};
