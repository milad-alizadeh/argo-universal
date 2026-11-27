import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { renderCounter } from '#mocks/render-counts';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
  CollapsibleLayoutSyncContext,
} from './collapsible';

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Collapsible/Renders',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const renders = renderCounter();

const idleLabel = 'Collapsible not drawn';

const detailLabel = 'Open tool call detail';

const contentLaidOut = fn<(height: number) => void>();

const layoutSync = {
  syncLayout: fn(),
  onMotionChange: fn(),
  grow: fn<(height: number) => void>(),
};

// Starts empty, so counting covers the collapsible's first draw, as a Feed row mounting does.
function OpenInAList(): ReactElement {
  const [drawn, setDrawn] = useState(false);

  return (
    <View>
      <button type="button" onClick={() => setDrawn(true)}>
        {idleLabel}
      </button>
      <Profiler id={renders.id} onRender={renders.onRender}>
        <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
          {drawn && (
            <Collapsible defaultOpen>
              <CollapsibleHeader icon="read" label="Read files" />
              <CollapsibleContent
                onLayout={({ nativeEvent }) =>
                  contentLaidOut(nativeEvent.layout.height)
                }
              >
                <View className="h-32">
                  <Text>{detailLabel}</Text>
                </View>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CollapsibleLayoutSyncContext.Provider>
      </Profiler>
    </View>
  );
}

const frame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

export const OpenAtRestDrawsOnceOnMount: Story = {
  render: () => <OpenInAList />,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('phone');
    await canvas.findByRole('button', { name: idleLabel });

    const counts = await renders.during(canvasElement, async () => {
      canvas.getByRole('button', { name: idleLabel }).click();
      await canvas.findByText(detailLabel);
      // Room for a measuring pass to land, if one is made.
      await frame();
      await frame();
    });

    await expect(counts.LayoutSyncedContent?.mounts).toBe(1);
    await expect(counts.LayoutSyncedContent?.updates).toEqual([]);
  },
};

async function observeClose(
  trigger: HTMLElement,
  content: HTMLElement,
): Promise<[number, ...number[]]> {
  const heights: [number, ...number[]] = [content.offsetHeight];
  const observer = new ResizeObserver(() => heights.push(content.offsetHeight));

  observer.observe(content);

  try {
    trigger.click();
    await waitFor(() => expect(content).not.toBeInTheDocument());

    return heights;
  } finally {
    observer.disconnect();
  }
}

export const OpenOnMountClosesFromItsFullHeight: Story = {
  render: () => <OpenInAList />,
  play: async ({ canvas }) => {
    await settleLayout('phone');

    contentLaidOut.mockClear();
    layoutSync.grow.mockClear();
    canvas.getByRole('button', { name: idleLabel }).click();
    const trigger = await canvas.findByRole('button', { name: 'Read files' });

    // React Native Web delivers onLayout asynchronously, after the mount measurement is queued.
    await waitFor(() =>
      expect(contentLaidOut.mock.lastCall?.[0] ?? 0).toBeGreaterThan(0),
    );

    const content = trigger.ownerDocument.getElementById(
      trigger.getAttribute('aria-controls') ?? '',
    );

    if (!content) throw new Error('The trigger must control a content region.');

    // Observe the same region before React commits the deferred close and adds clipping.
    const heights = await observeClose(trigger, content);

    // The list hears the entire height change even when Chromium skips frames.
    const heightChange = layoutSync.grow.mock.calls.reduce(
      (total, [delta]) => total + delta,
      0,
    );

    await expect(heights[0]).toBeGreaterThan(0);
    await expect(heightChange).toBe(-heights[0]);
    await expect(heights).toEqual([...heights].sort((a, b) => b - a));
  },
};
