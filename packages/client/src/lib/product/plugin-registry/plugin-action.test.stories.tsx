import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

// JSON is the external Plugin wire boundary; callbacks are supplied by the registry.
const fixture: WireNode = JSON.parse(`{
  "type": "ListItem", "key": "row", "props": { "title": "Deploy web" }, "children": [],
  "slots": { "actions": [{ "type": "Action.Section", "key": "run", "props": { "title": "Run" }, "slots": {}, "children": [
    { "type": "Action", "key": "copy", "props": { "label": "Copy link", "icon": "copy", "shortcut": { "modifiers": ["meta", "shift"], "key": "c" }, "onPress": { "$event": "onPress" } }, "slots": {}, "children": [] },
    { "type": "Action", "key": "disabled", "props": { "label": "Archive", "icon": "archive", "disabled": true, "onPress": { "$event": "onPress" } }, "slots": {}, "children": [] }
  ] }] }
}`);

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Action',
} satisfies Meta;

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
    await expect(onEvent).toHaveBeenCalledWith('row#actions/run/copy', {
      event: 'onPress',
    });
  },
};

const copyAndOpenFixture: WireNode = JSON.parse(`{
  "type": "Button", "key": "go", "slots": {}, "children": [],
  "props": { "label": "Copy code and open GitHub", "onPress": { "action": "sequence", "steps": [
    { "action": "copy", "text": "WDJB-MJHT" },
    { "action": "openUrl", "url": "https://github.com/login/device" }
  ] } }
}`);

// The browser's clipboard and window are the only replaced boundaries; the registry and the App's Actions run for real.
export const CopyAndOpen: Story = {
  render: () => <PluginTree root={copyAndOpenFixture} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    const copied = spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const opened = spyOn(window, 'open').mockReturnValue(null);

    onEvent.mockClear();
    await userEvent.click(canvas.getByText('Copy code and open GitHub'));
    await waitFor(() => expect(opened).toHaveBeenCalled());
    await expect(copied).toHaveBeenCalledWith('WDJB-MJHT');
    await expect(opened.mock.calls[0]?.[0]).toBe(
      'https://github.com/login/device',
    );
    await expect(onEvent).not.toHaveBeenCalled();
  },
};
