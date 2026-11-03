import {
  messageSlotId,
  type ReplaceableAnswer,
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
  replaceableState,
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

// What the Server answers for this Slot: core's own, or a Plugin's tree for a message.
const answerFor = (
  input: ReplaceableInput,
  replaces: boolean,
): ReplaceableAnswer =>
  replaces
    ? { type: 'replacement', pluginId: 'fixture', root: replacementTreeFixture }
    : { type: 'core', input };

type AnsweredSlotProps = ReplaceableSlotProps & { replaces: boolean };

const ignoreEvent = async (): Promise<void> => {};

const ignoreFallback = (): void => {};

// Stands in for the connected Slot: it draws, then draws again with the Server's answer (ADR-0021 keeps tRPC out of stories).
function AnsweredSlot({
  replaces,
  ...props
}: AnsweredSlotProps): React.JSX.Element {
  const [state, setState] = useState(coreSlotState(props.input));
  useEffect(() => {
    const arrival = setTimeout(() => {
      setState(replaceableState(props.input, answerFor(props.input, replaces)));
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

const answered = fn();

const drawing = (
  replaced: ReplaceableSlotDrawing['replaced'],
): ReplaceableSlotDrawing => ({
  replaced,
  render: (props) => {
    answered(props.input.slotId);

    return <AnsweredSlot {...props} replaces />;
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
    answered.mockClear();
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
    await expect(counts.AnsweredSlot).toBeUndefined();
    await expect(counts.ReplaceableSlotView).toBeUndefined();
    await expect(answered).not.toHaveBeenCalled();
    await expect(counts.ReplaceableSlot?.updates).toEqual([]);
  },
};

export const OnlyTheSlotAPluginRendersOpensAStream: Story = {
  beforeEach: () => {
    answered.mockClear();
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
    await expect(answered).toHaveBeenCalledWith(messageSlotId);
    await expect(
      answered.mock.calls.filter(([slotId]) => slotId !== messageSlotId),
    ).toEqual([]);
  },
};
