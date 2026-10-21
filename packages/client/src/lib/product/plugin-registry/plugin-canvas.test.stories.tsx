import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { Button } from '@repo/kit/primitives/actions/button';
import fixture from '@repo/mocks/plugins/canvas.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin registry/Canvas' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const scene = WireNode.parse(fixture);

const onEvent = fn();

// A cold browser fetches and compiles CanvasKit before the drawing is ready.
const canvasReady = { timeout: 15_000 };

const activity = 'Build activity';

interface PointerPoint {
  clientX: number;
  clientY: number;
}

function point(image: HTMLElement, x: number, y: number): PointerPoint {
  const bounds = image.getBoundingClientRect();

  return {
    clientX: bounds.left + (x * bounds.width) / 360,
    clientY: bounds.top + (y * bounds.height) / 216,
  };
}

function drawingPress(
  label: string,
  location: [number, number],
  key: string,
): Story {
  return {
    render: () => <PluginTree root={scene} onEvent={onEvent} />,
    play: async ({ canvas, userEvent }) => {
      await expect(
        canvas.findByRole('button', { name: label }, canvasReady),
      ).resolves.toBeInTheDocument();
      const image = canvas.getByRole('img', { name: activity });
      await userEvent.pointer({
        target: image,
        coords: point(image, ...location),
        keys: '[MouseLeft]',
      });
      await waitFor(() =>
        expect(onEvent).toHaveBeenCalledWith(key, { event: 'onPress' }),
      );
      await expect(canvas.getByRole('button', { name: label })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    },
  };
}

export const Rectangle = drawingPress('Web build', [50, 45], 'scene/box');

export const Circle = drawingPress('Native build', [210, 45], 'scene/circle');

export const SvgPath = drawingPress('Pending build', [295, 35], 'scene/path');

export const TransformedGroup = drawingPress(
  'Grouped file',
  [83, 135],
  'scene/group/nested',
);

export const AccessibleDrawings: Story = {
  render: () => <PluginTree root={scene} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    const button = await canvas.findByRole(
      'button',
      { name: 'Native build' },
      canvasReady,
    );

    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(onEvent).toHaveBeenCalledWith('scene/circle', {
      event: 'onPress',
    });
    await expect(button).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('list', { name: 'Build activity shapes' }),
    ).toBeInTheDocument();
  },
};

export const Hover: Story = {
  render: () => <PluginTree root={scene} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'Web build' }, canvasReady);
    const image = canvas.getByRole('img', { name: activity });
    await userEvent.pointer({ target: image, coords: point(image, 60, 50) });
    await expect(canvas.findByRole('tooltip')).resolves.toHaveTextContent(
      'Web build',
    );
    await expect(onEvent).not.toHaveBeenCalled();
  },
};

function DrawingPatch(): React.JSX.Element {
  const [root, setRoot] = useState(scene);

  return (
    <>
      <Button
        label="Change one shape"
        onPress={() =>
          setRoot(
            applyPatch(root, [
              {
                op: 'setProps',
                key: ['box'],
                props: { label: 'Changed build', intensity: 0.8 },
              },
            ]),
          )
        }
      />
      <PluginTree root={root} onEvent={onEvent} />
    </>
  );
}

export const CameraSurvivesPatch: Story = {
  render: DrawingPatch,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'Web build' }, canvasReady);
    const image = canvas.getByRole('img', { name: activity });
    canvas.getByRole('application', { name: 'Build activity canvas' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Change one shape' }),
    );
    await canvas.findByRole('button', { name: 'Changed build' }, canvasReady);
    const shifted = point(image, 20, 45);
    await userEvent.pointer({
      target: image,
      coords: { ...shifted, clientX: shifted.clientX + 40 },
      keys: '[MouseLeft]',
    });
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('scene/box', { event: 'onPress' }),
    );
  },
};
