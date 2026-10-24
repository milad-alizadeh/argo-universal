import { expect, waitFor } from 'storybook/test';

/*
 * Moves the Effort slider one level at a time, as arrow keys would.
 * It sets the value through input events: real key presses give the page user activation, and later
 * stories' image pickers would then open a file dialog that the test browser cancels.
 * `levels` are the level names the slider offers, in order; the slider's value is the index of the chosen level.
 */
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
  const current = effortIndexOf(slider);
  slider.focus();

  await moveThroughLevels(slider, { current, target, levels });
}

function effortIndex(levels: string[], name: string): number {
  const target = levels.indexOf(name);

  if (target < 0) throw new Error(`The slider does not offer ${name}.`);

  return target;
}

async function moveThroughLevels(
  slider: HTMLElement,
  {
    current,
    target,
    levels,
  }: { current: number; target: number; levels: string[] },
): Promise<void> {
  const direction = target > current ? 1 : -1;

  for (let moved = 1; moved <= Math.abs(target - current); moved += 1) {
    await stepTo(slider, current + direction * moved, levels);
  }
}

// One step: the slider holds the level and speaks its name.
async function stepTo(
  slider: HTMLElement,
  index: number,
  levels: string[],
): Promise<void> {
  moveTo(slider, index);
  await waitFor(() => expect(slider).toHaveValue(String(index)));
  await expect(slider).toHaveAttribute('aria-valuetext', levels[index] ?? '');
}

// The slider's place in its levels: its range input's value.
export function effortIndexOf(slider: HTMLElement): number {
  if (!(slider instanceof HTMLInputElement))
    throw new Error('The Effort slider is a range input.');

  return Number(slider.value);
}
