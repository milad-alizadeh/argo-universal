import { waitFor } from 'storybook/test';

const samples = 12;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const boxOf = (element: Element): Box => {
  const { left, top, right, bottom } = element.getBoundingClientRect();

  return { left, top, right, bottom };
};

export function intersection(a: Box, b: Box): Box | undefined {
  const box = {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };

  return box.right > box.left && box.bottom > box.top ? box : undefined;
}

// Whether `inner` lies inside `outer`, to a pixel the browser's rounding may take.
export function isInside(inner: Box, outer: Box, slack = 1): boolean {
  return (
    inner.left >= outer.left - slack &&
    inner.top >= outer.top - slack &&
    inner.right <= outer.right + slack &&
    inner.bottom <= outer.bottom + slack
  );
}

// One inset of a computed `inset()` clip, in pixels of the clipped element's `size`.
function insetLength(value: string, size: number): number {
  if (!value.startsWith('calc(')) return Number.parseFloat(value);
  const [share = '', sign = '', shift = ''] = value.slice(5, -1).split(' ');
  const offset = Number.parseFloat(shift) * (sign === '-' ? -1 : 1);

  return (size * Number.parseFloat(share)) / 100 + offset;
}

// The words of a CSS value, a `calc()` kept whole.
function topLevelWords(value: string): string[] {
  const words: string[] = [];
  let depth = 0;
  let word = '';

  for (const character of value) {
    depth += Number(character === '(') - Number(character === ')');

    if (character === ' ' && depth === 0) {
      words.push(word);
      word = '';
    } else {
      word += character;
    }
  }

  return [...words, word];
}

// The box a clip draws in: the computed `inset()` the browser reports for the `xywh()` the Inspector sets.
export function clipBox(element: Element): Box {
  const { clipPath } = getComputedStyle(element);
  const origin = element.getBoundingClientRect();

  const insets = topLevelWords(clipPath.slice('inset('.length)).slice(0, 4);

  if (!clipPath.startsWith('inset(') || insets.length < 4)
    throw new Error(`Expected an inset clip, got ${clipPath}.`);

  const [top, right, bottom, left] = [
    insetLength(insets[0] ?? '', origin.height),
    insetLength(insets[1] ?? '', origin.width),
    insetLength(insets[2] ?? '', origin.height),
    insetLength(insets[3] ?? '', origin.width),
  ];

  return {
    left: origin.left + left,
    top: origin.top + top,
    right: origin.left + origin.width - right,
    bottom: origin.top + origin.height - bottom,
  };
}

// The part of the Workbench that shows: its box inside its clip.
export function shownWorkbench(
  workbench: Element,
  clip: Element,
): Box | undefined {
  return intersection(boxOf(workbench), boxOf(clip));
}

export const glassBox = boxOf;

/*
 * Pause the animations the action starts on `targets`, then step them through the motion and measure at each step, so a
 * slow runner cannot skip its middle. The first and the last step are measured at rest on the clock too.
 */
export async function sampleMotion(
  action: () => void,
  targets: readonly Element[],
  measure: () => Promise<void>,
): Promise<number> {
  const started = (): Animation[] =>
    targets.flatMap((target) => target.getAnimations());

  action();

  const motion = await waitFor(() => {
    const animations = started();

    if (animations.length === 0)
      throw new Error('The action started no motion.');

    return animations;
  });

  for (const animation of motion) animation.pause();

  const duration = Math.max(
    ...motion.map((animation) =>
      Number(animation.effect?.getComputedTiming().endTime),
    ),
  );

  try {
    for (const step of Array.from({ length: samples + 1 }).keys()) {
      for (const animation of motion)
        animation.currentTime = (duration * step) / samples;

      await measure();
    }
  } finally {
    for (const animation of motion) animation.cancel();
  }

  return motion.length;
}
