import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { SplitButton } from './split-button';

const menuLabel = 'Allow options';

const scopes = [
  { value: 'once', label: 'Allow once' },
  { value: 'always', label: 'Always allow' },
] as const;

type Scope = (typeof scopes)[number]['value'];

interface ScopeSplitProps {
  narrow: boolean;
  onAllow: () => void;
  onValueChange: (value: Scope) => void;
}

// A split that picks what its button does: the chosen scope carries the check.
function ScopeSplit(props: ScopeSplitProps): React.JSX.Element {
  const [scope, setScope] = useState<Scope>('once');

  return (
    <SplitButton
      primary
      narrow={props.narrow}
      menuLabel={menuLabel}
      options={scopes}
      value={scope}
      onValueChange={(next) => {
        setScope(next);
        props.onValueChange(next);
      }}
    >
      <Button custom label="Allow" onPress={props.onAllow} />
    </SplitButton>
  );
}

const meta = {
  title: 'Tests/SplitButton',
  component: ScopeSplit,
  args: { narrow: false, onAllow: fn(), onValueChange: fn() },
} satisfies Meta<typeof ScopeSplit>;

export default meta;

type Story = StoryObj<typeof meta>;

// The acting button acts on its own; the chevron beside it opens the choices without acting.
export const PrimaryActionActsAlone: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }));
    await expect(args.onAllow).toHaveBeenCalledTimes(1);
    await expect(
      canvas.getByRole('button', { name: menuLabel }),
    ).toBeInTheDocument();
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

// Wide, the chevron opens a menu of the choices, never a sheet.
export const WideOpensMenu: Story = {
  play: async ({ canvas, canvasElement, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: menuLabel }));

    await expect(
      await page.findByRole('menuitemradio', { name: 'Allow once' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      page.getByRole('menuitemradio', { name: 'Always allow' }),
    );
    await expect(args.onValueChange).toHaveBeenCalledWith('always');
    await waitFor(() =>
      expect(page.queryByRole('menu')).not.toBeInTheDocument(),
    );
    await expect(args.onAllow).not.toHaveBeenCalled();
  },
};

// Narrow, the chevron opens a sheet named for the menu, its rows the choices; choosing closes it.
export const NarrowOpensSheet: Story = {
  args: { narrow: true },
  play: async ({ canvas, canvasElement, userEvent, args }) => {
    await settleViewport(layoutWidths.phone);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: menuLabel }));

    const sheet = within(await page.findByRole('dialog', { name: menuLabel }));
    await expect(page.queryByRole('menu')).not.toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: 'Allow once' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      sheet.getByRole('button', { name: 'Always allow' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(sheet.getByRole('button', { name: 'Always allow' }));
    await expect(args.onValueChange).toHaveBeenCalledWith('always');
    await waitFor(() =>
      expect(page.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(args.onAllow).not.toHaveBeenCalled();
  },
};

const squash = fn();

// A split whose chevron opens actions of its own.
function MergeSplit(props: { narrow: boolean }): React.JSX.Element {
  return (
    <SplitButton
      primary
      narrow={props.narrow}
      menuLabel="Merge options"
      actions={[
        { label: 'Squash and merge', onPress: squash },
        { label: 'Rebase and merge', onPress: fn() },
      ]}
    >
      <Button custom label="Merge PR" />
    </SplitButton>
  );
}

// Narrow actions sit in the same sheet; pressing one runs it and closes the sheet.
export const NarrowActionsInSheet: StoryObj<typeof MergeSplit> = {
  render: () => <MergeSplit narrow />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    squash.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Merge options' }),
    );

    const sheet = within(
      await page.findByRole('dialog', { name: 'Merge options' }),
    );
    await userEvent.click(
      sheet.getByRole('button', { name: 'Squash and merge' }),
    );
    await expect(squash).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(page.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};
