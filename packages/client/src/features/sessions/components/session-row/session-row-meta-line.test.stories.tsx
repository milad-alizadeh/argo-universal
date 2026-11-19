import { settleLayout } from '@repo/kit/mocks/story-layout';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { SessionRow } from './session-row';
import { issueItem } from './session-row-fixtures';
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
    <View style={{ width: 280 }}>
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
