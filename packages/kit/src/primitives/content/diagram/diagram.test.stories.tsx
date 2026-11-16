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

const drawingLabel = 'Flowchart: Request flow';

const codeText = 'code-text';

const diagramTitle = 'Request flow';

export const DrawsWithItsTitle: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: drawingLabel }),
    ).toBeVisible();
    await expect(canvas.getByTestId('code-block-title')).toHaveTextContent(
      diagramTitle,
    );
    await expect(canvas.queryByTestId(codeText)).not.toBeInTheDocument();
  },
};

export const SwitchesToCodeAndBack: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Show code' }),
    );
    await expect(canvas.getByTestId(codeText)).toHaveTextContent(
      'flowchart TD',
    );
    await expect(
      canvas.queryByTestId('diagram-artwork'),
    ).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Show diagram' }));
    await expect(
      await canvas.findByRole('button', { name: drawingLabel }),
    ).toBeVisible();
  },
};

export const CopiesTheSource: Story = {
  play: async ({ canvas, userEvent }) => {
    const clipboard = spyOn(
      navigator.clipboard,
      'writeText',
    ).mockResolvedValue();

    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy code' }));
      await waitFor(() =>
        expect(clipboard).toHaveBeenCalledWith(flowchartDiagram.source),
      );
    } finally {
      clipboard.mockRestore();
    }
  },
};

function opensFullScreen(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: drawingLabel }),
      );

      const body = within(document.body);
      const viewer = await body.findByRole('dialog');
      await settleOverlays();

      await expect(within(viewer).getByText(diagramTitle)).toBeVisible();
      await expect(
        within(viewer).getByTestId('diagram-viewer-canvas'),
      ).toBeVisible();

      await userEvent.click(
        within(viewer).getByRole('button', { name: 'Close' }),
      );
      await waitFor(() =>
        expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
      );
    },
  };
}

export const OpensFullScreenPhone = opensFullScreen(layoutWidths.phone);

export const OpensFullScreenWide = opensFullScreen(layoutWidths.wide);

export const ZoomsWithTheWheel: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: drawingLabel }),
    );

    const frame = await within(document.body).findByRole('application');
    const drawing = frame.querySelector('svg')?.parentElement;
    await settleOverlays();
    // The drawing is fitted once the frame has measured itself, which moves it off the corner.
    await waitFor(() =>
      expect(drawing?.style.transform).not.toMatch(
        /^translateX\(0px\) translateY\(0px\)/,
      ),
    );
    const before = drawing?.style.transform;

    frame.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -200,
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitFor(() => expect(drawing?.style.transform).not.toBe(before));

    await userEvent.click(
      within(document.body).getByRole('button', { name: 'Fit to screen' }),
    );
    await waitFor(() => expect(drawing?.style.transform).toBe(before));
  },
};

export const StreamsAsAPlaceholder: Story = {
  args: streamingDiagram,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('diagram-placeholder')).toBeInTheDocument();
    await expect(canvas.getByTestId('code-block-title')).toHaveTextContent(
      diagramTitle,
    );
    await expect(
      canvas.queryByRole('button', { name: 'Show code' }),
    ).not.toBeInTheDocument();
  },
};

export const ShowsCodeWhenItCannotDraw: Story = {
  args: unsupportedDiagram,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Couldn’t draw this diagram')).toBeVisible();
    await expect(canvas.getByTestId(codeText)).toHaveTextContent('gantt');
    await expect(
      canvas.queryByRole('button', { name: 'Show diagram' }),
    ).not.toBeInTheDocument();
  },
};
