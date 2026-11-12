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
 * On a wide window the reading column holds the content to its width, and a full Screen lets it run past. Two things
 * about the first frames make a single early read wrong, whichever way the claim goes:
 * - The size class reaches the Screen a render after the viewport does, so a first frame can be a phone's, uncapped
 *   either way. A full page therefore waits for the Screen's own column (the content's parent) to leave the phone's
 *   inset, then asserts once. It cannot wait for the wide inset itself: where the aside's lane holds the column
 *   (ADR-0049) the column's insets are the lane's edges, not that inset.
 * - The aside's lane is laid out from the width the last Screen measured (`lastScreenWidth`), and each measure moves
 *   the column's edges. A story leaves a width behind that is not this Screen's own (a full page measures its content,
 *   which is wider on CI's fonts than on a Mac), and the preview's centring wrapper lets the Screen shrink to its
 *   content, so its width walks to its own value over several frames, the edges moving 42px a frame while the content
 *   runs past the column. The App's Screen fills its region, which does not. The cap is the settled drawing's claim,
 *   so a reading column waits until the content fits `columnWidth()`. With no cap it never does, and the wait ends at
 *   its timeout with the numbers in the message.
 */
const keepsPhoneInset = (content: Element): boolean => {
  const column = content.parentElement;

  return (
    column !== null &&
    getComputedStyle(column).paddingLeft === `${phoneInset()}px`
  );
};

// What the drawing looks like now, so a failure explains itself from CI's log alone.
function describeColumn(content: Element): string {
  const column = content.parentElement ?? content;
  const style = getComputedStyle(column);

  return JSON.stringify({
    contentWidth: content.getBoundingClientRect().width,
    columnWidth: columnWidth(),
    columnPadding: [style.paddingLeft, style.paddingRight],
    columnMaxWidth: style.maxWidth,
    columnElementWidth: column.getBoundingClientRect().width,
    columnLeft: column.getBoundingClientRect().left,
    viewport: window.innerWidth,
  });
}

const fitsColumn = (content: Element): boolean =>
  content.getBoundingClientRect().width <= columnWidth();

// Inside the 15 s ceiling the Vitest config sets for the largest waitFor; a lane settles in a handful of frames.
const settleBudgetMs = 5000;

function expectFits(content: Element): void {
  if (!fitsColumn(content)) {
    throw new Error(`Content runs past the column: ${describeColumn(content)}`);
  }
}

// A fit has to hold: two more frames on, the lane has not moved the content again.
async function expectCapped(content: Element): Promise<void> {
  await waitFor(() => expectFits(content), { timeout: settleBudgetMs });
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  expectFits(content);
}

async function expectUncapped(content: Element): Promise<void> {
  await waitFor(() => expect(keepsPhoneInset(content)).toBe(false));
  await expect(
    fitsColumn(content),
    `Content fits the column: ${describeColumn(content)}`,
  ).toBe(false);
}

function columnCap(width: ScreenWidth, capped: boolean): Story {
  return atWidth(widths.Wide, {
    render: () => <WidthExample width={width} />,
    play: async ({ canvas }) => {
      const content = canvas.getByTestId(widthContent);

      await (capped ? expectCapped(content) : expectUncapped(content));
    },
  });
}

export const ReadingColumnCapsWide = columnCap('content', true);

export const FullWidthRunsPastColumn = columnCap('full', false);
