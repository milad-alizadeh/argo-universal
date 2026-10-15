import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { SplitButton } from './split-button';

const menuLabel = 'Allow options';

const allowOnce = 'Allow once';

const alwaysAllow = 'Always allow';

const scopes = [
  { value: 'once', label: allowOnce },
  { value: 'always', label: alwaysAllow },
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
function actsAlone(narrow: boolean, width: number): Story {
  return {
    args: { narrow },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Allow' }));
      await expect(args.onAllow).toHaveBeenCalledTimes(1);
      await expect(
        canvas.getByRole('button', { name: menuLabel }),
      ).toBeInTheDocument();
      await expect(args.onValueChange).not.toHaveBeenCalled();
    },
  };
}

export const WideActsAlone = actsAlone(false, layoutWidths.wide);

export const NarrowActsAlone = actsAlone(true, layoutWidths.phone);

// On the web, wide or narrow, the chevron opens Argo's menu of the choices, never a sheet.
function opensMenu(narrow: boolean, width: number): Story {
  return {
    args: { narrow },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: menuLabel }));

      await expect(
        await page.findByRole('menuitemradio', { name: allowOnce }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
      await userEvent.click(
        page.getByRole('menuitemradio', { name: alwaysAllow }),
      );
      await expect(args.onValueChange).toHaveBeenCalledWith('always');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await expect(args.onAllow).not.toHaveBeenCalled();
    },
  };
}

export const WideOpensMenu = opensMenu(false, layoutWidths.wide);

export const NarrowOpensMenu = opensMenu(true, layoutWidths.phone);
