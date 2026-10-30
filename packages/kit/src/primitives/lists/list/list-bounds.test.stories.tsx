import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '#primitives/lists/list-item';
import { Screen } from '#primitives/scaffolds/screen';
import { List } from './list';

const viewportHeight = 900;

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Bounds',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', viewportHeight);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const listLabel = 'Bounded rows';

const footer = 'The last line';

// More rows than the window holds, as a page of Issues or Sessions has.
const rows = Array.from({ length: 36 }, (_, index) => index + 1);

const onScreen = (box: DOMRect): boolean =>
  box.top >= 0 && box.bottom <= viewportHeight;

/*
 * A List of children takes the window's height as its cap, which is taller than the room a Screen's
 * heading leaves it. A frame that keeps that cap hangs past the end of its pane, and the scroll
 * that reaches the list's own end stops with its last rows and its footer off the window (#1420).
 */
export const ScrollingToTheEndShowsTheEnd: Story = {
  render: () => (
    <Screen title="Bounded" caption="Rows below a heading">
      <List
        appearance="plain"
        density="compact"
        accessibilityLabel={listLabel}
        footer={footer}
      >
        {rows.map((row) => (
          <ListItem key={row} title={`Row ${row}`} subtitle={`#${row}`} />
        ))}
      </List>
    </Screen>
  ),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(listLabel);
    await waitFor(() => expect(scroll.scrollHeight).toBeGreaterThan(0));

    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));

    await waitFor(async () => {
      for (const text of [`Row ${rows.length}`, footer]) {
        const box = canvas.getByText(text).getBoundingClientRect();

        await expect(
          { text, onScreen: onScreen(box) },
          `${text} sits at ${box.top}–${box.bottom} in a ${viewportHeight} window`,
        ).toEqual({ text, onScreen: true });
      }
    });
  },
};
