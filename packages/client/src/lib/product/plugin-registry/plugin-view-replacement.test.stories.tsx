import {
  PluginViewId,
  WireNode,
  type PluginInteraction,
} from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import type { PluginOnEvent } from './plugin-rendering';

const root = WireNode.parse(fixture);

const first = PluginViewId.parse('first');

const second = PluginViewId.parse('second');

const received = fn();

let confirmation: PromiseWithResolvers<void>;

function delivery(
  id: PluginViewId,
  replace: (id: PluginViewId) => void,
): PluginOnEvent {
  return (key, interaction) => {
    received(id, key, interaction);

    if (!isConfirmation(interaction)) return;
    replace(second);

    return confirmation.promise;
  };
}

function isConfirmation(interaction: PluginInteraction): boolean {
  return (
    interaction.event === 'onAction' &&
    interaction.payload.path.at(-1) === 'onConfirm'
  );
}

function Replacement(): React.JSX.Element {
  const [viewId, replace] = useState(first);

  return (
    <PluginDetailView
      viewId={viewId}
      root={root}
      onEvent={fn(delivery(viewId, replace))}
    />
  );
}

const meta = {
  title: 'Tests/Plugin view replacement',
  render: Replacement,
  beforeEach: (): (() => void) => {
    confirmation = Promise.withResolvers<void>();

    return () => confirmation.resolve();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fieldName = 'Overlay name';

const openDialog = 'Open dialog';

export const ReplacementClearsOverlayDraft: Story = {
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: openDialog }));
    const field = await page.findByRole('textbox', { name: fieldName });
    await userEvent.clear(field);
    await userEvent.type(field, 'Old draft');
    await userEvent.click(page.getByRole('button', { name: 'Apply dialog' }));
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: fieldName })).toBeNull(),
    );
    await userEvent.click(canvas.getByRole('button', { name: openDialog }));
    const fresh = await page.findByRole('textbox', { name: fieldName });
    await expect(fresh).toHaveValue('Argo');
    confirmation.resolve();
    await confirmation.promise;
    await userEvent.click(fresh);
    await expect(fresh).toBeVisible();
  },
};
