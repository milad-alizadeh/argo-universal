import { wideBreakpoint } from '@repo/kit/mocks/story-layout';
import { expect, waitFor, within } from 'storybook/test';
import { configurationLabel } from '../../src/features/composer/components/composer-configuration/configuration-values';
import type { PlayContext } from './composer-story-context.test.mocks';
import {
  agentModelLabel,
  chooseModelLabel,
} from './composer-test-contract.test.mocks';

export type PickerStep = Pick<PlayContext, 'canvas' | 'userEvent'> & {
  width: number;
};

// Drives the Configure control the way a reader does, on a phone's sheet and on a desktop's popover alike.
export interface Configure {
  // Opens Configure; does nothing when it is already open.
  open(): Promise<void>;
  // A desktop's models stay open beside Configure after a pick; a phone's page slides back to Configure.
  chooseModel(name: string): Promise<void>;
  // `levels` are the names the slider offers, in order; its value is the index of the chosen level.
  chooseEffort(levels: string[], name: string): Promise<void>;
  // The index of the level the slider holds.
  effort(): Promise<number>;
  // What the control's chip shows: the model on a phone, the effort level when wide.
  expectChip(model: string, effort?: string): Promise<void>;
}

export function configure(
  { canvas, userEvent }: Pick<PlayContext, 'canvas' | 'userEvent'>,
  width: number,
): Configure {
  const overlay = within(document.body);
  // Pairs with the `useOptionalSheet()` the composer reads: narrower than this it is a Sheet, otherwise a popover.
  const wide = width >= wideBreakpoint();

  const slider = (): Promise<HTMLInputElement> =>
    overlay.findByRole<HTMLInputElement>('slider', { name: 'Effort' });

  // Radix marks a closing popover at once, before its exit transition ends.
  const modelsOpen = (): boolean =>
    overlay
      .queryByRole('dialog', { name: 'Model' })
      ?.getAttribute('data-state') === 'open';

  return {
    async open() {
      if (overlay.queryByRole('button', { name: chooseModelLabel })) return;
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      await overlay.findByRole('button', { name: chooseModelLabel });
    },
    async chooseModel(name) {
      if (!modelsOpen())
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseModelLabel }),
        );

      const choice = await overlay.findByRole('radio', {
        name: configurationLabel(name),
      });

      await userEvent.click(choice);
      // A phone's next pick waits until the old choice has gone, or its click lands mid-slide.
      await (wide
        ? expect(choice).toHaveAttribute('aria-checked', 'true')
        : waitFor(() => expect(choice).not.toBeInTheDocument()));
    },
    async chooseEffort(levels, name) {
      const input = await slider();
      const current = Number(input.value);
      const target = levels.indexOf(name);

      if (target < 0) throw new Error(`The slider does not offer ${name}.`);
      input.focus();

      for (const index of stepsBetween(current, target))
        await moveTo(input, index, levels);
    },
    async effort() {
      return Number((await slider()).value);
    },
    async expectChip(model, effort) {
      await expect(
        canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
      ).toHaveTextContent(wide ? (effort ?? '') : model);
    },
  };
}

// The levels passed on the way from one to another, one at a time, as arrow keys would.
function stepsBetween(from: number, to: number): number[] {
  const direction = to > from ? 1 : -1;

  return Array.from(
    { length: Math.abs(to - from) },
    (_, step) => from + direction * (step + 1),
  );
}

/*
 * Sets the value through an input event: real key presses give the page user activation, and later stories'
 * image pickers would then open a file dialog that the test browser cancels.
 */
function setValue(input: HTMLInputElement, index: number): void {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(input, String(index));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function moveTo(
  input: HTMLInputElement,
  index: number,
  levels: string[],
): Promise<void> {
  setValue(input, index);
  await waitFor(() => expect(input).toHaveValue(String(index)));
  await expect(input).toHaveAttribute('aria-valuetext', levels[index] ?? '');
}
