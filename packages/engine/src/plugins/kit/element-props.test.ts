import { PluginViewId } from '@repo/contracts/plugins/wire';
import { describe, expect, it, vi } from 'vitest';
import { requireViewHandler } from '../views/handler';
import { toProps } from './element-props';
import { toWire, type Handlers, type Instance } from './wire-tree';

const pickerType = 'FieldGroup.Picker';

const pressKey = JSON.stringify(['0', 'onPress']);

const picker = (onPress: () => void): Instance => ({
  type: pickerType,
  props: toProps(pickerType, {
    title: 'Agent',
    value: 'a',
    options: [],
    presentation: 'page',
    onValueChange: vi.fn<() => void>(),
    footerAction: { label: 'Add Agents', onPress },
  }),
  children: [],
});

describe('a Picker’s footerAction.onPress from a Plugin', () => {
  it('goes on the wire inside footerAction, as the schema says', () => {
    const handlers: Handlers = new Map();
    const node = toWire(picker(vi.fn<() => void>()), handlers);

    expect(node.props.footerAction).toEqual({
      label: 'Add Agents',
      onPress: { $event: 'onPress' },
    });
    expect(node.props.onPress).toBeUndefined();
    expect([...handlers.keys()]).toContain(pressKey);
  });

  it('runs the function when the event arrives', async () => {
    const onPress = vi.fn<() => void>();
    const handlers: Handlers = new Map();

    toWire(picker(onPress), handlers);
    await handlers.get(pressKey)?.();

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('is found by the Server when the App sends the press', () => {
    const node = toWire(picker(vi.fn<() => void>()), new Map());

    const input = {
      pluginId: 'p',
      path: '/',
      revision: 1,
      key: node.key,
      event: 'onPress',
      viewId: PluginViewId.parse('v'),
    };

    expect(() => requireViewHandler(node, input)).not.toThrow();
  });

  it('still refuses a function nested anywhere else', () => {
    expect(() =>
      toProps(pickerType, {
        options: { label: 'a', value: vi.fn<() => void>() },
      }),
    ).toThrow('must be JSON or a top-level function');
  });
});
