import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { SessionLayout } from './session-layout';

const feedText = 'Read 2 files, edited 1 file';

const meta = {
  title: 'Tests/SessionLayout',
  component: SessionLayout,
  parameters: { screenPreview: true },
  args: {
    header: <Text>Session</Text>,
    feed: <Text>{feedText}</Text>,
    composer: <TextInput accessibilityLabel="Message" />,
    onDropFiles: fn(),
  },
} satisfies Meta<typeof SessionLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;

type DragType = 'dragenter' | 'dragleave' | 'dragover' | 'drop';

const notes = new File(['# Notes'], 'notes.md', { type: 'text/markdown' });

const filesTransfer = (): DataTransfer => {
  const transfer = new DataTransfer();
  transfer.items.add(notes);

  return transfer;
};

const textTransfer = (): DataTransfer => {
  const transfer = new DataTransfer();
  transfer.setData('text/plain', feedText);

  return transfer;
};

const drag = (
  target: Element,
  type: DragType,
  transfer: DataTransfer = filesTransfer(),
): DragEvent => {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    dataTransfer: transfer,
  });

  target.dispatchEvent(event);

  return event;
};

const dropLabel = /Drop files/;

// Draws the layout again on demand, with a new drop handler each time.
function RedrawingLayout(
  props: React.ComponentProps<typeof SessionLayout>,
): React.JSX.Element {
  const [redraws, setRedraws] = useState(0);

  return (
    <SessionLayout
      {...props}
      header={
        <Pressable
          accessibilityRole="button"
          onPress={() => setRedraws(redraws + 1)}
        >
          <Text>Redraw</Text>
        </Pressable>
      }
      composer={<Text>{`Redrawn ${redraws}`}</Text>}
      onDropFiles={(dropped) => props.onDropFiles?.(dropped)}
    />
  );
}

const zoneCleared = (canvas: Canvas): Promise<void> =>
  waitFor(() => expect(canvas.queryByText(dropLabel)).toBeNull());

// Files over the window show the zone; crossing into a child fires its enter before the parent's leave, so the zone stays until the files leave the window.
export const ZoneStaysUntilFilesLeaveTheWindow: Story = {
  play: async ({ canvas }) => {
    const feed = await canvas.findByText(feedText);
    const message = canvas.getByLabelText('Message');
    drag(feed, 'dragenter');
    await expect(await canvas.findByText(dropLabel)).toBeVisible();
    drag(message, 'dragenter');
    drag(feed, 'dragleave');
    await expect(canvas.getByText(dropLabel)).toBeVisible();
    drag(message, 'dragleave');
    await zoneCleared(canvas);
  },
};

export const OtherDragsLeaveItAlone: Story = {
  play: async ({ canvas }) => {
    const feed = await canvas.findByText(feedText);
    drag(feed, 'dragenter', textTransfer());
    const over = drag(feed, 'dragover', textTransfer());
    await expect(over.defaultPrevented).toBe(false);
    await expect(canvas.queryByText(dropLabel)).toBeNull();
  },
};

export const EscapeClearsTheZone: Story = {
  play: async ({ canvas, userEvent }) => {
    drag(await canvas.findByText(feedText), 'dragenter');
    await canvas.findByText(dropLabel);
    await userEvent.keyboard('{Escape}');
    await zoneCleared(canvas);
  },
};

// Files dropped anywhere on the pane, the Feed as well as the Composer, attach to the draft.
const dropOn = (target: (canvas: Canvas) => Promise<HTMLElement>): Story => ({
  play: async ({ canvas, args }) => {
    const element = await target(canvas);

    drag(element, 'dragenter');
    await canvas.findByText(dropLabel);
    await expect(drag(element, 'dragover').defaultPrevented).toBe(true);
    await expect(drag(element, 'drop').defaultPrevented).toBe(true);
    await expect(args.onDropFiles).toHaveBeenCalledWith({
      files: [notes],
      folders: 0,
    });
    await zoneCleared(canvas);
  },
});

export const DropOnTheFeedAttaches = dropOn((canvas) =>
  canvas.findByText(feedText),
);

export const DropOnTheComposerAttaches = dropOn((canvas) =>
  canvas.findByLabelText('Message'),
);

// The page draws again mid-drag, as a streaming Feed does, with a new drop handler: the zone stays, and the drop reaches the newest handler.
export const RedrawKeepsTheZone: Story = {
  render: (args) => <RedrawingLayout {...args} />,
  play: async ({ canvas, args, userEvent }) => {
    const feed = await canvas.findByText(feedText);

    drag(feed, 'dragenter');
    await canvas.findByText(dropLabel);
    await userEvent.click(canvas.getByRole('button', { name: 'Redraw' }));
    await expect(await canvas.findByText('Redrawn 1')).toBeVisible();
    await expect(canvas.getByText(dropLabel)).toBeVisible();
    drag(feed, 'drop');
    await expect(args.onDropFiles).toHaveBeenCalledWith({
      files: [notes],
      folders: 0,
    });
  },
};

// Without a draft to attach to, files neither show the zone nor drop.
export const NoDraftNoZone: Story = {
  args: { onDropFiles: undefined },
  play: async ({ canvas }) => {
    const feed = await canvas.findByText(feedText);
    drag(feed, 'dragenter');
    await expect(drag(feed, 'dragover').defaultPrevented).toBe(false);
    await expect(canvas.queryByText(dropLabel)).toBeNull();
  },
};
