import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '#primitives/lists/list-item';
import { Screen } from '#primitives/scaffolds/screen';
import { List } from './list';

const viewportHeight = 700;

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Hidden page',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', viewportHeight);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const listLabel = 'Rows of a page';

const redraw = 'Redraw';

const scrolledTo = 400;

// Long enough that the row reached by scrolling is not the first.
const rows = Array.from({ length: 40 }, (_, index) => index + 1);

const frames = async (count: number): Promise<void> => {
  for (let frame = 0; frame < count; frame += 1)
    await new Promise(requestAnimationFrame);
};

// The stack hides the page below a pushed one with display: none, and shows it again on Back.
const setHidden = (element: HTMLElement, hidden: boolean): void => {
  element.style.display = hidden ? 'none' : '';
};

function PageBelow(): React.JSX.Element {
  const [drawn, redrawn] = useState(0);

  return (
    <>
      <button type="button" onClick={() => redrawn(drawn + 1)}>
        {redraw}
      </button>
      <div
        data-testid="page"
        style={{ display: 'flex', flex: 1, minHeight: 0 }}
      >
        <Screen title="Page">
          <List
            appearance="plain"
            density="compact"
            accessibilityLabel={listLabel}
          >
            {rows.map((row) => (
              <ListItem
                key={row}
                title={`Row ${row}`}
                subtitle={`#${row} ${drawn}`}
              />
            ))}
          </List>
        </Screen>
      </div>
    </>
  );
}

/*
 * A page below a pushed one is hidden, not gone, and its rows can still draw. Rows that draw while hidden measure at
 * zero, so Legend List's content has no height the moment the page shows again, and the browser takes the scroll
 * position back to the top. Back returns to where the list was.
 */
export const BackReturnsToWhereTheListWas: Story = {
  render: () => <PageBelow />,
  play: async ({ canvas, userEvent }) => {
    const scroll = await canvas.findByLabelText(listLabel);
    const page = canvas.getByTestId('page');

    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(
        scroll.clientHeight + scrolledTo,
      ),
    );

    scroll.scrollTop = scrolledTo;
    await frames(5);
    setHidden(page, true);
    await frames(5);
    await userEvent.click(canvas.getByRole('button', { name: redraw }));
    await frames(10);
    setHidden(page, false);

    // Every frame from the one it shows in, as a jump to the top and back is what a reader would see.
    for (let frame = 0; frame < 20; frame += 1) {
      await expect(scroll.scrollTop).toBe(scrolledTo);
      await frames(1);
    }

    await expect(scroll.scrollHeight).toBeGreaterThan(
      scroll.clientHeight + scrolledTo,
    );
  },
};
