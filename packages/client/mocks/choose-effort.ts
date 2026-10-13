import { expect, waitFor } from 'storybook/test';

/*
 * Moves the Effort slider one level at a time, as arrow keys would.
 * It sets the value through input events: real key presses give the page user activation, and later
 * stories' image pickers would then open a file dialog that the test browser cancels.
 * `levels` are the level names the slider offers, in order; an unset slider sits at the first stop.
 */
const noSelection = 'No selection';

const valueText = 'aria-valuetext';

function moveTo(slider: HTMLElement, index: number): void {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(slider, String(index));
  slider.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function chooseEffort(
  slider: HTMLElement,
  levels: string[],
  name: string,
): Promise<void> {
  const target = effortIndex(levels, name);
  const current = currentEffort(slider, levels);
  slider.focus();

  if (needsFirstStop(slider, current, target)) {
    moveTo(slider, current + 1);
    moveTo(slider, current);

    return;
  }

  await moveThroughLevels(slider, levels, { current, target });
}

function effortIndex(levels: string[], name: string): number {
  const target = levels.indexOf(name);

  if (target < 0) throw new Error(`The slider does not offer ${name}.`);

  return target;
}

function needsFirstStop(
  slider: HTMLElement,
  current: number,
  target: number,
): boolean {
  return current === target && slider.getAttribute(valueText) === noSelection;
}

async function moveThroughLevels(
  slider: HTMLElement,
  levels: string[],
  { current, target }: { current: number; target: number },
): Promise<void> {
  const direction = target > current ? 1 : -1;

  for (let moved = 1; moved <= Math.abs(target - current); moved += 1) {
    const index = current + direction * moved;
    moveTo(slider, index);
    await waitFor(() =>
      expect(slider).toHaveAttribute(valueText, levels[index]),
    );
  }
}

function currentEffort(slider: HTMLElement, levels: string[]): number {
  return Math.max(0, levels.indexOf(slider.getAttribute(valueText) ?? ''));
}
