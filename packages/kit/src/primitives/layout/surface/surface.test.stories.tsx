import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Surface } from './surface';

const pressed = fn();

const archived = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Surface',
  component: Surface,
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

function activation(activate: (button: HTMLElement) => Promise<void>): Story {
  return {
    args: { kind: 'card', onPress: pressed, children: <Text>Open build</Text> },
    play: async ({ canvas }) => {
      await activate(canvas.getByRole('button', { name: 'Open build' }));
      await expect(pressed).toHaveBeenCalledOnce();
    },
  };
}

export const PointerActivation = activation(async (button) =>
  userEvent.click(button),
);

function keyboardActivation(key: string): Story {
  return activation(async (button) => {
    button.focus();
    await userEvent.keyboard(key);
  });
}

export const EnterActivation = keyboardActivation('{Enter}');

export const SpaceActivation = keyboardActivation(' ');

const archive = (
  <Action
    key="archive"
    icon="archive"
    label="Archive build"
    onPress={archived}
  />
);

export const ContextActions: Story = {
  args: {
    kind: 'card',
    children: <Text>Build actions</Text>,
    actions: archive,
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.pointer({
      target: canvas.getByText('Build actions'),
      keys: '[MouseRight]',
    });
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole('menuitem', {
        name: 'Archive build',
      }),
    );
    await expect(archived).toHaveBeenCalledOnce();
  },
};
