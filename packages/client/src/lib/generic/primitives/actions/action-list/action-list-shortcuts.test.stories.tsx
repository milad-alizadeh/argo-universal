import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TextInput } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Action, ActionList, ActionShortcutScope } from './index';

const choose = fn();

const meta = { title: 'Tests/ActionList/Shortcuts' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortcutConflicts: Story = {
  render: () => (
    <ActionShortcutScope>
      <TextInput accessibilityLabel="Draft" />
      <ActionList>
        <Action
          label="First"
          icon="add"
          shortcut={{ modifiers: ['alt'], key: 'i' }}
          onPress={() => choose('first')}
        />
      </ActionList>
      <ActionList variant="context" trigger={<Button label="Second list" />}>
        <Action
          label="Later"
          icon="archive"
          shortcut={{ modifiers: ['alt'], key: 'i' }}
          onPress={() => choose('later')}
        />
      </ActionList>
      <ActionList
        variant="context"
        plugin
        trigger={<Button label="Plugin row" />}
      >
        <Action
          label="Reserved"
          icon="rename"
          shortcut={{ modifiers: [], key: 'Enter' }}
          onPress={() => choose('reserved')}
        />
      </ActionList>
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
    await expect(later.querySelector('[aria-label]')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByRole('button', { name: 'Plugin row' }),
    });
    const reserved = await page.findByRole('menuitem', { name: 'Reserved' });
    await expect(reserved.querySelector('[aria-label]')).toBeNull();
    await userEvent.keyboard('{Escape}');
  },
};
