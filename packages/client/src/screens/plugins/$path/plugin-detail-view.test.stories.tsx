import type { WireNode } from '@repo/contracts/plugins/wire';
import { runListRoot } from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { expect, within } from 'storybook/test';
import { PluginDetailView } from './plugin-detail-view';

const meta = {
  title: 'Tests/Screens/Plugins/Plugin page',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
  args: { callbacks: { onEvent: action('Plugin event') } },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const stacked: WireNode = {
  type: 'Stack',
  key: 'page',
  props: {},
  children: [runListRoot],
  slots: {},
};

const rowTitle = 'Deploy web';

function* ancestors(from: HTMLElement): Generator<HTMLElement> {
  for (let el: HTMLElement | null = from; el; el = el.parentElement) yield el;
}

// The nearest ancestor of the rows that scrolls.
function scrollerOf(text: HTMLElement): HTMLElement {
  const found = [...ancestors(text)].find((el) =>
    /auto|scroll/.test(getComputedStyle(el).overflowY),
  );

  if (!found) throw new Error('Recorded catalog needs a scrolling List');

  return found;
}

// The gap between the page's edge and the edge of the scroll view that holds the rows: a margin the page adds around the List.
function marginAroundList(canvasElement: HTMLElement): number {
  const page = canvasElement.querySelector('[data-testid="plugin-page"]');

  if (!page) throw new Error('Recorded catalog needs a plugin-page');

  const scroller = scrollerOf(within(canvasElement).getByText(rowTitle));

  return (
    scroller.getBoundingClientRect().left - page.getBoundingClientRect().left
  );
}

const story = (root: WireNode): Story => ({
  args: { root },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText(rowTitle);

    await expect(marginAroundList(canvasElement)).toBe(0);
  },
});

// A List alone on a page keeps to the page's one gutter, whether or not a Stack holds it (#1576).
export const RootList: Story = story(runListRoot);

export const ListInAStack: Story = story(stacked);
