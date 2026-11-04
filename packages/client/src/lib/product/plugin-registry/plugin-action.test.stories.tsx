import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

// JSON is the external Plugin wire boundary; callbacks are supplied by the registry.
const fixture: WireNode = JSON.parse(`{
  "type": "ListItem", "key": "row", "props": { "title": "Deploy web" }, "children": [],
  "slots": { "actions": [{ "type": "Action.Section", "key": "run", "props": { "title": "Run" }, "slots": {}, "children": [
    { "type": "Action", "key": "copy", "props": { "label": "Copy link", "icon": "copy", "shortcut": { "modifiers": ["meta", "shift"], "key": "c" }, "onPress": { "operation": "copyLink", "args": {} } }, "slots": {}, "children": [] },
    { "type": "Action", "key": "disabled", "props": { "label": "Archive", "icon": "archive", "disabled": true, "onPress": { "operation": "archive", "args": {} } }, "slots": {}, "children": [] }
  ] }] }
}`);

const onPageCall = fn(async () => {});

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Action',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContextAction: Story = {
  render: () => <PluginTree root={fixture} onPageCall={onPageCall} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    onPageCall.mockClear();
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText('Deploy web'),
    });
    const page = within(canvasElement.ownerDocument.body);
    const copy = await page.findByRole('menuitem', { name: 'Copy link' });
    await waitFor(() => expect(copy).toBeVisible());
    await expect(
      page.getByRole('menuitem', { name: 'Archive' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(copy);
    await expect(onPageCall).toHaveBeenCalledTimes(1);
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'copyLink', args: {} },
      expect.objectContaining({ key: 'row#actions/run/copy' }),
    );
  },
};
