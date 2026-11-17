import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { settleOverlays } from '#mocks/settle-overlays';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import {
  flowchartDiagram,
  streamingDiagram,
  unsupportedDiagram,
} from './diagram-fixtures';
import { Diagram } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Diagram',
  component: Diagram,
  args: flowchartDiagram,
} satisfies Meta<typeof Diagram>;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

type Canvas = Parameters<Play>[0]['canvas'];

type UserEvent = Parameters<Play>[0]['userEvent'];

const drawingLabel = 'Flowchart: Request flow';

const diagramTitle = 'Request flow';

const sourceHeader = /flowchart TD/;

const page = (): ReturnType<typeof within> => within(document.body);

const drawing = (canvas: Canvas): Promise<HTMLElement> =>
  canvas.findByRole('button', { name: drawingLabel });

async function openViewer(
  canvas: Canvas,
  userEvent: UserEvent,
): Promise<HTMLElement> {
  await userEvent.click(await drawing(canvas));
  const viewer = await page().findByRole('dialog');
  await settleOverlays();

  return viewer;
}

const drawnWidth = (): number =>
  page().getByTestId('diagram-viewer-drawing').getBoundingClientRect().width;

async function fittedWidth(): Promise<number> {
  await waitFor(() => expect(drawnWidth()).toBeGreaterThan(0));

  return drawnWidth();
}

function zoomIn(): void {
  page()
    .getByRole('application')
    .dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -200,
        bubbles: true,
        cancelable: true,
      }),
    );
}

interface WidthStories {
  Phone: Story;
  Wide: Story;
}

// One story per width for each story that presses (docs/agents/storybook.md).
function atEachWidth(play: Play): WidthStories {
  const at = (width: number): Story => ({
    play: async (context) => {
      await settleLayout(width);
      await play(context);
    },
  });

  return { Phone: at(layoutWidths.phone), Wide: at(layoutWidths.wide) };
}

export const DrawsWithItsTitle: Story = {
  play: async ({ canvas }) => {
    await expect(await drawing(canvas)).toBeVisible();
    await expect(canvas.getByText(diagramTitle)).toBeVisible();
    await expect(canvas.queryByText(sourceHeader)).not.toBeInTheDocument();
  },
};

const showsCode = atEachWidth(async ({ canvas, userEvent }) => {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Show code' }),
  );

  await expect(canvas.getByText(sourceHeader)).toBeVisible();
  await expect(
    canvas.queryByRole('button', { name: drawingLabel }),
  ).not.toBeInTheDocument();
});

export const ShowsCodePhone = showsCode.Phone;

export const ShowsCodeWide = showsCode.Wide;

const showsDiagramAgain = atEachWidth(async ({ canvas, userEvent }) => {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Show code' }),
  );

  await userEvent.click(canvas.getByRole('button', { name: 'Show diagram' }));

  await expect(await drawing(canvas)).toBeVisible();
});

export const ShowsDiagramAgainPhone = showsDiagramAgain.Phone;

export const ShowsDiagramAgainWide = showsDiagramAgain.Wide;

const copiesTheSource = atEachWidth(async ({ canvas, userEvent }) => {
  const clipboard = spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

  try {
    await userEvent.click(canvas.getByRole('button', { name: 'Copy code' }));

    await waitFor(() =>
      expect(clipboard).toHaveBeenCalledWith(flowchartDiagram.source),
    );
  } finally {
    clipboard.mockRestore();
  }
});

export const CopiesTheSourcePhone = copiesTheSource.Phone;

export const CopiesTheSourceWide = copiesTheSource.Wide;

const opensFullScreen = atEachWidth(async ({ canvas, userEvent }) => {
  const viewer = await openViewer(canvas, userEvent);

  const frame = within(viewer)
    .getByTestId('diagram-viewer')
    .getBoundingClientRect();

  await expect(within(viewer).getByText(diagramTitle)).toBeVisible();
  await expect(frame.height).toBeGreaterThan(window.innerHeight * 0.9);
  await expect(frame.width).toBeGreaterThan(window.innerWidth * 0.9);
});

export const OpensFullScreenPhone = opensFullScreen.Phone;

export const OpensFullScreenWide = opensFullScreen.Wide;

const closesFullScreen = atEachWidth(async ({ canvas, userEvent }) => {
  const viewer = await openViewer(canvas, userEvent);

  await userEvent.click(within(viewer).getByRole('button', { name: 'Close' }));

  await waitFor(() =>
    expect(page().queryByRole('dialog')).not.toBeInTheDocument(),
  );
});

export const ClosesFullScreenPhone = closesFullScreen.Phone;

export const ClosesFullScreenWide = closesFullScreen.Wide;

const zoomsWithTheWheel = atEachWidth(async ({ canvas, userEvent }) => {
  await openViewer(canvas, userEvent);
  const fitted = await fittedWidth();

  zoomIn();

  await waitFor(() => expect(drawnWidth()).toBeGreaterThan(fitted));
});

export const ZoomsWithTheWheelPhone = zoomsWithTheWheel.Phone;

export const ZoomsWithTheWheelWide = zoomsWithTheWheel.Wide;

const fitsAgain = atEachWidth(async ({ canvas, userEvent }) => {
  await openViewer(canvas, userEvent);
  const fitted = await fittedWidth();
  zoomIn();
  await waitFor(() => expect(drawnWidth()).toBeGreaterThan(fitted));

  await userEvent.click(page().getByRole('button', { name: 'Fit to screen' }));

  await waitFor(() => expect(drawnWidth()).toBeCloseTo(fitted));
});

export const FitsAgainPhone = fitsAgain.Phone;

export const FitsAgainWide = fitsAgain.Wide;

export const StreamsAsAPlaceholder: Story = {
  args: streamingDiagram,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Drawing diagram')).toBeInTheDocument();
    await expect(canvas.getByText(diagramTitle)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Show code' }),
    ).not.toBeInTheDocument();
  },
};

export const ShowsCodeWhenItCannotDraw: Story = {
  args: unsupportedDiagram,
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/draw this diagram/)).toBeVisible();
    await expect(canvas.getByText(/gantt/)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Show diagram' }),
    ).not.toBeInTheDocument();
  },
};
