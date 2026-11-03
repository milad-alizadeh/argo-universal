import type { ScreenWidth } from '@repo/contracts/kit-tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { columnWidth } from '#mocks/story-layout';
import { Screen } from './index';
import { widthContent, WidthExample } from './screen-width.mocks';
import { atWidth, screenWidths as widths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/Width',
  component: Screen,
  args: { title: 'Title' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

const left = (element: Element): number => element.getBoundingClientRect().left;

// The heading and the content start on one edge at every width.
function sharedEdge(width: ScreenWidth): Story {
  return {
    render: () => <WidthExample width={width} />,
    play: async ({ canvas }) => {
      const title = canvas.getByRole('heading', { level: 1, name: 'Title' });

      await expect(left(canvas.getByTestId(widthContent))).toBe(left(title));
    },
  };
}

export const ReadingColumnPhone = atWidth(widths.Phone, sharedEdge('content'));

export const ReadingColumnTablet = atWidth(
  widths.Tablet,
  sharedEdge('content'),
);

export const ReadingColumnWide = atWidth(widths.Wide, sharedEdge('content'));

export const FullWidthPhone = atWidth(widths.Phone, sharedEdge('full'));

export const FullWidthTablet = atWidth(widths.Tablet, sharedEdge('full'));

export const FullWidthWide = atWidth(widths.Wide, sharedEdge('full'));

// On a wide window the reading column holds the content to its width, and a full Screen lets it run past.
function columnCap(width: ScreenWidth, capped: boolean): Story {
  return atWidth(widths.Wide, {
    render: () => <WidthExample width={width} />,
    play: async ({ canvas }) => {
      const runs = canvas
        .getByTestId(widthContent)
        .getBoundingClientRect().width;

      await expect(runs <= columnWidth()).toBe(capped);
    },
  });
}

export const ReadingColumnCapsWide = columnCap('content', true);

export const FullWidthRunsPastColumn = columnCap('full', false);

const region = 'width-region';

// The App's page beside its 384 sidebar at 1440, where a page with an aside gives it a lane at the right.
const besideSidebar = 1440 - 384;

/*
 * A narrow page with no aside has no list to share a column with, so it stays centred in the region, never moved left
 * for an aside it does not have.
 */
export const NarrowWithoutAsideStaysCentred = atWidth(1440, {
  render: () => (
    <View testID={region} className="h-80" style={{ width: besideSidebar }}>
      <WidthExample width="narrow" />
    </View>
  ),
  play: async ({ canvas }) => {
    // A Screen draws once before it measures its own width; read it after it has.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const screen = canvas.getByTestId(region).getBoundingClientRect();
    const content = canvas.getByTestId(widthContent).getBoundingClientRect();
    const gutters = [content.left - screen.left, screen.right - content.right];

    await expect(
      Math.abs((gutters[0] ?? 0) - (gutters[1] ?? 0)) <= 1,
      `gutters ${gutters.join(' and ')}`,
    ).toBe(true);
  },
});
