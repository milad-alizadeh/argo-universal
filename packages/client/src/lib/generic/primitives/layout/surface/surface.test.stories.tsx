import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Surface } from './surface';

const pressed = fn();

const archived = fn();

const meta = { title: 'Tests/Surface', component: Surface } satisfies Meta<
  typeof Surface
>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActivatesWithPointerAndKeyboard: Story = {
  args: { kind: 'card', onPress: pressed, children: <Text>Open build</Text> },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Open build' });
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(pressed).toHaveBeenCalledTimes(3);
  },
};

export const ContextActions: Story = {
  args: {
    kind: 'card',
    children: <Text>Build actions</Text>,
    actions: (
      <ActionList>
        <Action icon="archive" label="Archive build" onPress={archived} />
      </ActionList>
    ),
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
