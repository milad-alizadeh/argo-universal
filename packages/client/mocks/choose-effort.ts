import { expect, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';

// Moves the Effort slider like a keyboard user: focus it, then press an arrow per level.
// `levels` are the level names the slider offers, in order; an unset slider sits at the first stop.
const noSelection = 'No selection';
const valueText = 'aria-valuetext';

export async function chooseEffort(
  slider: HTMLElement,
  levels: string[],
  name: string,
): Promise<void> {
  const target = levels.indexOf(name);
  if (target < 0) throw new Error(`The slider does not offer ${name}.`);
  const current = Math.max(
    0,
    levels.indexOf(slider.getAttribute(valueText) ?? ''),
  );
  slider.focus();
  // An unset slider cannot report a move onto its first stop, so step off it and back.
  if (current === target && slider.getAttribute(valueText) === noSelection) {
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowLeft}');
    return;
  }
  const key = target > current ? '{ArrowRight}' : '{ArrowLeft}';
  const direction = target > current ? 1 : -1;
  for (let moved = 1; moved <= Math.abs(target - current); moved += 1) {
    await userEvent.keyboard(key);
    // The slider follows the Session, so wait for each level to land before the next press.
    await waitFor(() =>
      expect(slider).toHaveAttribute(
        valueText,
        levels[current + direction * moved],
      ),
    );
  }
}
