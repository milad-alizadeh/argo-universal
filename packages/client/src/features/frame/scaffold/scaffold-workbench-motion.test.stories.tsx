import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { vi } from 'vitest';
import { SessionSwitchScaffold } from './scaffold-session-switch.mocks';
import {
  sampleMotionFrames,
  sampleWorkbenchSlide,
} from './scaffold-workbench-motion.test.mocks';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/WorkbenchMotion',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  args: { inspectorOpen: true },
  beforeEach: (): Promise<void> => settleLayout(2560),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

const hideInspector = 'Hide Inspector';

const showInspector = 'Show Inspector';

const motionFrames = 24;

// Time a heavy Inspector commit can spend on the main thread before paint.
const heavyCommit = 240;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

async function assertSliding(
  canvas: Canvas,
  action: string,
  busy = 0,
): Promise<void> {
  const workbench = await canvas.findByTestId(workbenchId);
  const button = canvas.getByRole('button', { name: action });
  const left = (): number => Math.round(workbench.getBoundingClientRect().left);
  const start = left();

  const { startTime, currentTime, positions } = await sampleWorkbenchSlide(
    workbench,
    () => button.click(),
    busy,
  );

  const end = left();
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  const between = positions.filter(
    (position) => position > min && position < max,
  );

  await expect(startTime).toBeNull();
  await expect(currentTime).toBe(0);
  await expect(positions[0]).toBe(start);
  await expect(end).not.toBe(start);
  await expect(new Set(between).size).toBeGreaterThan(busy === 0 ? 0 : 4);
  await expect(canvas.getByTestId(workbenchId)).toBe(workbench);

  const visibility = expect(workbench);
  await (action === showInspector ? visibility.not : visibility).toBeVisible();
}

function closesAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas }) => assertSliding(canvas, hideInspector),
  };
}

export const GutterWorkbenchSlidesWhenTheInspectorCloses: Story =
  closesAt(2560);

// Beside the open Inspector the gutter is too narrow; closing it frees the room.
export const AutoHiddenWorkbenchSlidesWhenTheInspectorCloses: Story = {
  args: { inspectorOpen: false, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout(1856),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await userEvent.click(canvas.getByRole('button', { name: showInspector }));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await assertSliding(canvas, hideInspector);
  },
};

export const WorkbenchSlidesWhenTheExpandedInspectorRestores: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await assertSliding(canvas, 'Restore Inspector');
  },
};

export const WorkbenchTakesItsPlaceAtOnceOnASessionSwitch: Story = {
  render: () => <SessionSwitchScaffold />,
  beforeEach: (): Promise<void> => settleLayout(1856),
  play: async ({ canvas }) => {
    const workbench = await canvas.findByTestId(workbenchId);

    const button = canvas.getByRole('button', {
      name: 'Open another Session',
    });

    const left = (): number => workbench.getBoundingClientRect().left;
    const start = left();

    const animate = vi.spyOn(workbench, 'animate');

    try {
      const positions = await sampleMotionFrames(
        () => button.click(),
        left,
        motionFrames,
      );

      const end = positions.at(-1);
      const between = positions.filter((at) => at !== start && at !== end);

      await expect(end).not.toBe(start);
      await expect(between).toEqual([]);
      await expect(canvas.getByTestId(workbenchId)).toBe(workbench);
      await expect(animate).not.toHaveBeenCalled();
    } finally {
      animate.mockRestore();
    }
  },
};

// A heavy Inspector commit must not spend the Workbench's motion before it paints: it keeps pace with the panes.
export const WorkbenchSlidesAfterAHeavyInspectorClose: Story = {
  ...closesAt(2560),
  play: async ({ canvas }) => assertSliding(canvas, hideInspector, heavyCommit),
};

export const WorkbenchSlidesOutAfterAHeavyInspectorOpen: Story = {
  args: { inspectorOpen: false, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout(1856),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await assertSliding(canvas, showInspector, heavyCommit);
  },
};
