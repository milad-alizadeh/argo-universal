import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { SessionSwitchScaffold } from './scaffold-session-switch.mocks';
import {
  sampleBusyMotionFrames,
  sampleMotionFrames,
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

// Includes the settled destination after the Frame's 280ms transition.
const motionFrames = 24;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

async function assertSliding(canvas: Canvas, action: string): Promise<void> {
  const workbench = await canvas.findByTestId(workbenchId);
  const button = canvas.getByRole('button', { name: action });
  const left = (): number => workbench.getBoundingClientRect().left;
  const start = left();

  const positions = await sampleMotionFrames(
    () => button.click(),
    left,
    motionFrames,
  );

  await expect(positions.at(-1)).not.toBe(start);
  await expect(new Set(positions.map(Math.round)).size).toBeGreaterThan(2);
  await expect(canvas.getByTestId(workbenchId)).toBe(workbench);
  await expect(workbench).toBeVisible();
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

    const positions = await sampleMotionFrames(
      () => button.click(),
      left,
      motionFrames,
    );

    const end = positions.at(-1);
    const between = positions.filter((at) => at !== start && at !== end);

    await expect(end).not.toBe(start);
    await expect(between).toEqual([]);
  },
};

// A pane's first render that holds the main thread this long in the press's commit.
const heavyCommit = 240;

// Frames on the real clock: longer than the motion at a 60Hz paint.
const realFrames = 30;

// Places strictly between where the Workbench was and where it settles, while it still shows.
async function travelAfterHeavyCommit(
  canvas: Canvas,
  action: string,
): Promise<number[]> {
  const workbench = await canvas.findByTestId(workbenchId);
  const button = canvas.getByRole('button', { name: action });
  const shown = (): boolean => getComputedStyle(workbench).opacity !== '0';

  const left = (): number =>
    shown() ? Math.round(workbench.getBoundingClientRect().left) : Number.NaN;

  const start = left();

  const positions = await sampleBusyMotionFrames(() => button.click(), left, {
    frames: realFrames,
    busy: heavyCommit,
  });

  const drawn = positions.filter((at) => !Number.isNaN(at));
  const end = drawn.at(-1);

  return drawn.filter((at) => at !== start && at !== end);
}

// Drawn at several places on the way, not landed on its place in a frame or two.
async function assertTravelsAfterHeavyCommit(
  canvas: Canvas,
  action: string,
): Promise<void> {
  const between = await travelAfterHeavyCommit(canvas, action);

  await expect(new Set(between).size).toBeGreaterThan(4);
}

// A heavy Inspector commit must not spend the Workbench's motion before it paints: it keeps pace with the panes.
export const WorkbenchSlidesAfterAHeavyInspectorClose: Story = {
  ...closesAt(2560),
  play: async ({ canvas }) =>
    assertTravelsAfterHeavyCommit(canvas, hideInspector),
};

export const WorkbenchSlidesOutAfterAHeavyInspectorOpen: Story = {
  args: { inspectorOpen: false, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout(1856),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await assertTravelsAfterHeavyCommit(canvas, showInspector);
  },
};
