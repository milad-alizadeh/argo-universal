import type { ScreenWidth } from '@repo/contracts/kit-tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { columnWidth, phoneInset } from '#mocks/story-layout';
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

/*
 * On a wide window the reading column holds the content to its width, and a full Screen lets it run past. The size
 * class reaches the Screen a render after the viewport does, so a loaded machine can draw a first frame that is not
 * wide yet, uncapped either way. The claim is about the wide drawing, so it first waits for the Screen's own column
 * (the content's parent) to leave the phone's inset, then asserts once. It cannot wait for the wide inset itself:
 * where the aside's lane holds the column (ADR-0049) the column's insets are the lane's edges, not that inset.
 */
const keepsPhoneInset = (content: Element): boolean => {
  const column = content.parentElement;

  return (
    column !== null &&
    getComputedStyle(column).paddingLeft === `${phoneInset()}px`
  );
};

function columnCap(width: ScreenWidth, capped: boolean): Story {
  return atWidth(widths.Wide, {
    render: () => <WidthExample width={width} />,
    play: async ({ canvas }) => {
      const content = canvas.getByTestId(widthContent);

      await waitFor(() => expect(keepsPhoneInset(content)).toBe(false));
      await expect(content.getBoundingClientRect().width <= columnWidth()).toBe(
        capped,
      );
    },
  });
}

export const ReadingColumnCapsWide = columnCap('content', true);

export const FullWidthRunsPastColumn = columnCap('full', false);
