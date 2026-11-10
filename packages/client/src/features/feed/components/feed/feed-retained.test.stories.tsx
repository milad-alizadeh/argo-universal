import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { RetainedSessions } from '#lib/product/retained-sessions';
import { Feed, type FeedProps } from './feed';
import { feedScrollId, scrolledToEnd, settleWait } from './feed-reader.mocks';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/Retained',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// One more Session than the App retains, so opening the last one drops a page.
const sessions = ['first', 'second', 'third', 'fourth'] as const;

function SessionButton({
  id,
  onOpen,
}: {
  id: string;
  onOpen: (id: string) => void;
}): React.JSX.Element {
  return (
    <Pressable
      role="button"
      aria-label={`Open ${id}`}
      onPress={() => onOpen(id)}
    >
      <Text>{id}</Text>
    </Pressable>
  );
}

// Four Sessions' Feeds behind the App's own retention, as a wide window keeps them.
function RetainedFeeds(props: FeedProps): React.JSX.Element {
  const [shown, setShown] = useState<string>(sessions[0]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row' }}>
        {sessions.map((id) => (
          <SessionButton key={id} id={id} onOpen={setShown} />
        ))}
      </View>
      <RetainedSessions sessionId={shown}>
        {(id) => (
          <View testID={`page-${id}`} style={{ flex: 1 }}>
            <Feed {...props} sessionId={id} />
          </View>
        )}
      </RetainedSessions>
    </View>
  );
}

const intersects = (box: DOMRect, view: DOMRect): boolean =>
  box.height > 0 && box.bottom > view.top && box.top < view.bottom;

const drawsText = (element: Element, view: DOMRect): boolean =>
  element.children.length === 0 &&
  !!element.textContent.trim() &&
  intersects(element.getBoundingClientRect(), view);

// Whether any text of the Feed is drawn inside its view.
function drawsRows(scroll: HTMLElement): boolean {
  const view = scroll.getBoundingClientRect();

  return [...scroll.querySelectorAll('*')].some((element) =>
    drawsText(element, view),
  );
}

function scrollOf(canvasElement: HTMLElement, id: string): HTMLElement {
  const scroll = canvasElement.querySelector<HTMLElement>(
    `[data-testid="page-${id}"] [data-testid="${feedScrollId}"]`,
  );

  if (!scroll) throw new Error(`No Feed for ${id}`);

  return scroll;
}

function press(canvasElement: HTMLElement, id: string): void {
  const button = canvasElement.querySelector<HTMLElement>(
    `[aria-label="Open ${id}"]`,
  );

  if (!button) throw new Error(`No button for ${id}`);
  button.click();
}

// Opens a Session and waits until its Feed is the one shown, at its end.
async function open(
  canvasElement: HTMLElement,
  id: string,
): Promise<HTMLElement> {
  press(canvasElement, id);
  const scroll = await waitFor(() => scrollOf(canvasElement, id));
  await waitFor(() => expect(scroll).toBeVisible());
  await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);

  return scroll;
}

// Each visit swaps which pages sit behind the shown one, and the fourth Session drops one that a later visit mounts again; a Feed that comes back still draws its rows at its end.
const visits = [
  'second',
  'first',
  'second',
  'first',
  'third',
  'fourth',
  'second',
  'first',
];

export const ShowsRowsAfterSwitchingBack: Story = {
  render: (args) => <RetainedFeeds {...args} />,
  play: async ({ canvasElement }) => {
    await settleLayout('wide');
    await waitFor(
      () => expect(drawsRows(scrollOf(canvasElement, 'first'))).toBe(true),
      settleWait,
    );

    for (const id of visits) {
      const scroll = await open(canvasElement, id);
      await expect(drawsRows(scroll)).toBe(true);
    }
  },
};
