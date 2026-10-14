import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { BottomSheet } from '#primitives/overlays/bottom-sheet';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Picker } from './picker';

const modes = [
  { value: 'ask', label: 'Ask' },
  { value: 'edit', label: 'Edit' },
] as const;

function ModeRow(): React.JSX.Element {
  const [mode, setMode] = useState('ask');

  return (
    <GroupedListSection>
      <Picker
        variant="row"
        label="Mode"
        options={modes}
        value={mode}
        onValueChange={setMode}
      />
    </GroupedListSection>
  );
}

// The row inside an open phone sheet, whose pages it pushes.
function ModeSheet(): React.JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <BottomSheet open={open} onOpenChange={setOpen} label="Configure">
      <ModeRow />
    </BottomSheet>
  );
}

const meta = {
  title: 'Tests/Picker drill row',
  render: (): React.JSX.Element => <ModeRow />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const overlay = (): ReturnType<typeof within> => within(document.body);

export const HoverOpensSidePopoverWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.hover(canvas.getByRole('button', { name: /^Mode,/ }));

    const options = await overlay().findByRole('dialog', {
      name: 'Select Mode',
    });

    await waitFor(() => expect(options).toBeVisible());
  },
};

export const PressPushesPagePhone: Story = {
  render: () => <ModeSheet />,
  play: async ({ userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await overlay().findByRole('button', { name: /^Mode,/ }),
    );
    await expect(
      await overlay().findByText('Select Mode', { exact: true }),
    ).toBeVisible();
  },
};
