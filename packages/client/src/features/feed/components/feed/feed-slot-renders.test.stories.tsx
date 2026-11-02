import type { ReplaceableMessage } from '@repo/contracts/plugins/replaceable';
import {
  messageSlotId,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import { replacementTreeFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Profiler, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import {
  ReplaceableSlotView,
  type ReplaceableSlotDrawing,
  type ReplaceableSlotProps,
} from '#lib/product/plugin-registry/replaceable-slot';
import {
  coreSlotState,
  reduceReplaceable,
  ReplaceableSlotRenderer,
} from '../../../../lib/product/plugin-registry';
import { Feed } from './feed';
import { feedScrollId, scrollToTop, settleWait } from './feed-reader.mocks';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/SlotRenders',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const replacementText = 'Plugin replacement';

// What the Server sends a stream for this Slot: core's own, or a Plugin's tree for a message.
const firstMessage = (
  input: ReplaceableInput,
  replaces: boolean,
): ReplaceableMessage =>
  replaces
    ? {
        type: 'replacement',
        pluginId: 'fixture',
        path: 'render:fixture',
        message: {
          type: 'snapshot',
          root: replacementTreeFixture,
          revision: 1,
        },
      }
    : { type: 'core', input };

type StreamedSlotProps = ReplaceableSlotProps & { replaces: boolean };

const ignoreEvent = async (): Promise<void> => {};

const ignoreFallback = (): void => {};

// Stands in for the connected Slot: it draws, then draws again with its stream's first message (ADR-0021 keeps tRPC out of stories).
function StreamedSlot({
  replaces,
  ...props
}: StreamedSlotProps): React.JSX.Element {
  const [state, setState] = useState(coreSlotState(props.input));
  useEffect(() => {
    const arrival = setTimeout(() => {
      setState((current) =>
        reduceReplaceable(current, firstMessage(props.input, replaces)),
      );
    });

    return (): void => clearTimeout(arrival);
  }, [props.input, replaces]);

  return (
    <ReplaceableSlotView
      {...props}
      state={state}
      onEvent={ignoreEvent}
      onFallback={ignoreFallback}
    />
  );
}

const streamed = fn();

const drawing = (
  replaced: ReplaceableSlotDrawing['replaced'],
): ReplaceableSlotDrawing => ({
  replaced,
  render: (props) => {
    streamed(props.input.slotId);

    return <StreamedSlot {...props} replaces />;
  },
});

const noPlugin = drawing([]);

const messagePlugin = drawing([messageSlotId]);

const renders = renderCounter();

const idleLabel = 'Feed not open';

let openFeed = (): void => {};

// Starts without the Feed, so counting covers every row's first draw and not only those a scroll reaches.
function SlotsFeed({
  slots,
}: {
  slots: ReplaceableSlotDrawing;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    openFeed = (): void => setOpen(true);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Text>{idleLabel}</Text>
      <Profiler id={renders.id} onRender={renders.onRender}>
        <ReplaceableSlotRenderer value={slots}>
          {open ? <Feed {...feedArgs} /> : null}
        </ReplaceableSlotRenderer>
      </Profiler>
    </View>
  );
}

export const RowsNoPluginReplacesDrawOnce: Story = {
  beforeEach: () => {
    streamed.mockClear();
  },
  render: () => <SlotsFeed slots={noPlugin} />,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText(idleLabel);

    const counts = await renders.during(canvasElement, async () => {
      openFeed();
      await scrollToTop(await canvas.findByTestId(feedScrollId));
    });

    await expect(counts.ReplaceableSlot?.mounts).toBeGreaterThan(0);
    await expect(counts.StreamedSlot).toBeUndefined();
    await expect(counts.ReplaceableSlotView).toBeUndefined();
    await expect(streamed).not.toHaveBeenCalled();
    await expect(counts.ReplaceableSlot?.updates).toEqual([]);
  },
};

export const OnlyTheSlotAPluginRendersOpensAStream: Story = {
  beforeEach: () => {
    streamed.mockClear();
  },
  render: () => <SlotsFeed slots={messagePlugin} />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await canvas.findByText(idleLabel);
    openFeed();

    await waitFor(async () => {
      await expect(
        (await canvas.findAllByText(replacementText)).length,
      ).toBeGreaterThan(0);
    }, settleWait);
    await expect(streamed).toHaveBeenCalledWith(messageSlotId);
    await expect(
      streamed.mock.calls.filter(([slotId]) => slotId !== messageSlotId),
    ).toEqual([]);
  },
};
