import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
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

const layoutSync = {
  syncLayout: fn(),
  onMotionChange: fn(),
  grow: fn(),
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
              <CollapsibleContent>
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
