import {
  PluginViewId,
  WireNode,
  type ComponentEvent,
} from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import type { PluginOnEvent } from './plugin-rendering';

const root = applyPatch(WireNode.parse(fixture), [
  { op: 'setProps', key: ['sheet'], props: { open: true } },
]);

const first = PluginViewId.parse('first');

const second = PluginViewId.parse('second');

const received = fn();

let confirmation: PromiseWithResolvers<void>;

function delivery(
  id: PluginViewId,
  replace: (id: PluginViewId) => void,
): PluginOnEvent {
  return (key, event) => {
    received(id, key, event);

    if (!isConfirmation(key, event)) return;
    replace(second);

    return confirmation.promise;
  };
}

function isConfirmation(key: string, event: ComponentEvent): boolean {
  return key === 'overlays/sheet/body/apply' && event.event === 'onPress';
}

function Replacement(): React.JSX.Element {
  const [viewId, replace] = useState(first);

  return (
    <PluginDetailView
      viewId={viewId}
      root={root}
      callbacks={{ onEvent: fn(delivery(viewId, replace)) }}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ViewReplacement',
  render: Replacement,
  beforeEach: (): (() => void) => {
    confirmation = Promise.withResolvers<void>();

    return () => confirmation.resolve();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fieldName = 'Overlay name';

export const ReplacementClearsOverlayDraft: Story = {
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const field = await page.findByRole('textbox', { name: fieldName });
    await userEvent.clear(field);
    await userEvent.type(field, 'Old draft');
    await userEvent.click(page.getByRole('button', { name: 'Apply sheet' }));
    await waitFor(() =>
      expect(page.getByRole('textbox', { name: fieldName })).toHaveValue(
        'Argo',
      ),
    );
    const fresh = page.getByRole('textbox', { name: fieldName });
    confirmation.resolve();
    await confirmation.promise;
    await userEvent.click(fresh);
    await expect(fresh).toBeVisible();
  },
};
