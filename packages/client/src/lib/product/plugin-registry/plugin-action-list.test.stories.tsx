import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

// JSON is the external Plugin wire boundary; callbacks are supplied by the registry.
const fixture: WireNode = JSON.parse(`{
  "type": "ActionList", "key": "actions", "props": { "variant": "context" },
  "slots": { "trigger": [{ "type": "ListItem", "key": "row", "props": { "title": "Deploy web" }, "slots": {}, "children": [] }] },
  "children": [{ "type": "ActionList.Section", "key": "run", "props": { "title": "Run" }, "slots": {}, "children": [
    { "type": "Action", "key": "copy", "props": { "label": "Copy link", "icon": "copy", "shortcut": { "modifiers": ["meta", "shift"], "key": "c" }, "onPress": { "$event": "onPress" } }, "slots": {}, "children": [] },
    { "type": "Action", "key": "disabled", "props": { "label": "Archive", "icon": "archive", "disabled": true, "onPress": { "$event": "onPress" } }, "slots": {}, "children": [] }
  ] }]
}`);

const onEvent = fn();

const meta = { title: 'Tests/Plugin registry/ActionList' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContextDispatch: Story = {
  render: () => <PluginTree root={fixture} onEvent={onEvent} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    onEvent.mockClear();
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
    await expect(onEvent).toHaveBeenCalledTimes(1);
    await expect(onEvent).toHaveBeenCalledWith('actions/run/copy', {
      event: 'onPress',
    });
  },
};
