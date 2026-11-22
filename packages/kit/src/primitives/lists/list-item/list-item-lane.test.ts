import { describe, expect, it } from 'vitest';
import { laneInsets, laneMetrics } from './list-item-lane';

const spacing = 4;

type Platform = 'ios' | 'android';

const classNumber = (name: string): number =>
  Number(name.replaceAll(/\D/g, '')) * spacing;

// The inset a lane's class draws on a phone: Tailwind's `left-N` is N x 4.
function insetOf(lane: keyof typeof laneInsets, platform: Platform): number {
  const classes = laneInsets[lane].split(' ');
  const own = classes.find((name) => name.startsWith(`${platform}:left-`));
  const plain = classes.find((name) => name.startsWith('left-'));

  return classNumber(own ?? plain ?? '');
}

describe('the leading lane insets', () => {
  it.each([
    ['row', 'ios'],
    ['row', 'android'],
    ['avatar', 'ios'],
    ['avatar', 'android'],
  ] as const)('%s on %s starts where the title does', (lane, platform) => {
    const { mark, gap } = laneMetrics[lane];

    expect(insetOf(lane, platform)).toBe(
      laneMetrics.gutter + mark + gap[platform],
    );
  });
});
