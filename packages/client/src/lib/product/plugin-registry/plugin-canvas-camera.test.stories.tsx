import { WireNode } from '@repo/contracts/plugins/wire';
import { Button } from '@repo/kit/primitives/actions/button';
import fixture from '@repo/mocks/plugins/canvas.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin registry/Canvas camera' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

// A cold browser fetches and compiles CanvasKit before the drawing is ready.
const canvasReady = { timeout: 15_000 };

const labels = 'File labels';

const scene = WireNode.parse(fixture);

const narrow = WireNode.parse({
  ...scene,
  props: { ...scene.props, label: labels },
  children: [
    {
      type: 'Canvas.Rect',
      key: 'cell',
      props: { x: 170, y: 100, width: 20, height: 32, tone: 'muted' },
      children: [],
      slots: {},
    },
    {
      type: 'Canvas.Text',
      key: 'caption',
      props: {
        x: 171,
        y: 101,
        text: 'File',
        tone: 'neutral',
        onPress: { $event: 'onPress' },
      },
      children: [],
      slots: {},
    },
  ],
});

function Sample({ root }: { root: WireNode }): React.JSX.Element {
  return (
    <View style={{ width: 360 }}>
      <PluginTree root={root} onEvent={onEvent} />
    </View>
  );
}

export const ZoomAndCull: Story = {
  render: () => <Sample root={narrow} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'File' }, canvasReady);
    const image = canvas.getByRole('img', { name: labels });

    const frame = canvas.getByRole('application', {
      name: 'File labels canvas',
    });

    const label = within(image).getByText('File');
    frame.focus();
    await userEvent.keyboard('++');
    await waitFor(() => expect(label).toBeVisible());
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(label).not.toBeVisible());
    await expect(onEvent).not.toHaveBeenCalled();
  },
};

export const FixedCameraDoesNotZoom: Story = {
  render: () => (
    <Sample root={{ ...narrow, props: { ...narrow.props, camera: 'fixed' } }} />
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'File' }, canvasReady);
    const image = canvas.getByRole('img', { name: labels });

    const frame = canvas.getByRole('application', {
      name: 'File labels canvas',
    });

    frame.focus();
    await userEvent.keyboard('++++');
    await expect(within(image).getByText('File')).not.toBeVisible();
    await expect(onEvent).not.toHaveBeenCalled();
  },
};

function CameraPatch(): React.JSX.Element {
  const [root, setRoot] = useState(scene);

  const onPress = (): void =>
    setRoot({ ...root, props: { ...root.props, camera: 'fixed' } });

  return (
    <>
      <Button label="Fit scene" onPress={onPress} />
      <Sample root={root} />
    </>
  );
}

export const FixedAfterPan: Story = {
  render: CameraPatch,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'Web build' }, canvasReady);
    const image = canvas.getByRole('img', { name: 'Build activity' });
    canvas.getByRole('application', { name: 'Build activity canvas' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    await userEvent.click(canvas.getByRole('button', { name: 'Fit scene' }));
    const bounds = image.getBoundingClientRect();
    await userEvent.pointer({
      target: image,
      coords: { clientX: bounds.left + 20, clientY: bounds.top + 45 },
      keys: '[MouseLeft]',
    });
    await expect(onEvent).toHaveBeenCalledWith('scene/box', {
      event: 'onPress',
    });
  },
};

export const ReleaseOutsideFixed: Story = {
  render: () => (
    <>
      <Button label="Outside" />
      <Sample root={{ ...scene, props: { ...scene.props, camera: 'fixed' } }} />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('button', { name: 'Web build' }, canvasReady);
    const image = canvas.getByRole('img', { name: 'Build activity' });
    const bounds = image.getBoundingClientRect();
    const coords = { clientX: bounds.left + 60, clientY: bounds.top + 45 };
    await userEvent.pointer({ target: image, coords, keys: '[MouseLeft>]' });
    const outside = canvas.getByRole('button', { name: 'Outside' });
    await userEvent.pointer({
      target: outside,
      coords: { clientX: bounds.left, clientY: bounds.top - 20 },
    });
    await userEvent.pointer({ target: outside, keys: '[/MouseLeft]' });
    await userEvent.pointer({ target: image, coords });
    await expect(canvas.findByRole('tooltip')).resolves.toHaveTextContent(
      'Web build',
    );
    await expect(onEvent).not.toHaveBeenCalled();
  },
};
