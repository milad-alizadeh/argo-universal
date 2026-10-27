import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TextInput } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { PluginTreeContext } from '#kit/plugin-tree-context';
import { Button } from '#primitives/actions/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  Action,
  ActionButtons,
  ActionShortcutScope,
  ContextActions,
} from './index';

const choose = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Actions/Action/Shortcuts',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortcutConflicts: Story = {
  render: () => (
    <ActionShortcutScope>
      <TextInput accessibilityLabel="Draft" />
      <ActionButtons
        actions={
          <Action
            key="first"
            label="First"
            icon="add"
            shortcut={{ modifiers: ['alt', 'alt'], key: 'i' }}
            onPress={() => choose('first')}
          />
        }
      />
      <ContextActions
        actions={
          <Action
            key="later"
            label="Later"
            icon="archive"
            shortcut={{ modifiers: ['alt'], key: 'i' }}
            onPress={() => choose('later')}
          />
        }
      >
        <Button label="Second list" />
      </ContextActions>
      <PluginTreeContext value>
        <ContextActions
          actions={
            <Action
              key="reserved"
              label="Reserved"
              icon="rename"
              shortcut={{ modifiers: [], key: 'Enter' }}
              onPress={() => choose('reserved')}
            />
          }
        >
          <Button label="Plugin row" />
        </ContextActions>
      </PluginTreeContext>
    </ActionShortcutScope>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    choose.mockClear();
    await settleViewport(layoutWidths.wide);
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(choose).toHaveBeenCalledTimes(1);
    await expect(choose).toHaveBeenLastCalledWith('first');
    await userEvent.click(canvas.getByRole('textbox', { name: 'Draft' }));
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(choose).toHaveBeenCalledTimes(1);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByRole('button', { name: 'Second list' }),
    });
    const later = await page.findByRole('menuitem', { name: 'Later' });
    await expect(within(later).queryByText('I')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByRole('button', { name: 'Plugin row' }),
    });
    const reserved = await page.findByRole('menuitem', { name: 'Reserved' });
    await expect(within(reserved).queryByText('↵')).toBeNull();
    await userEvent.keyboard('{Escape}');
  },
};
