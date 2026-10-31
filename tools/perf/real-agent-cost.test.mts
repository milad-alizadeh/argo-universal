import { describe, expect, it } from 'vitest';
import type { PinnedOption } from './real-agent-choice.mts';
import { costPinFailure, type ReportedOption } from './real-agent-cost.mts';

const option = (
  configId: string,
  currentValue: string | boolean,
): ReportedOption => ({ configId, currentValue });

const pin: readonly PinnedOption[] = [
  { configId: 'model', value: 'cheapest' },
  { configId: 'effort', value: 'low' },
];

const pinned = [option('model', 'cheapest'), option('effort', 'low')];

describe('proving a real-Agent run is pinned before it prompts', () => {
  it('passes options the Agent reports back at the pinned values', () => {
    expect(costPinFailure(pin, pinned)).toBeUndefined();
  });

  it('refuses the Agent default the pin was meant to replace', () => {
    expect(
      costPinFailure(pin, [
        option('model', 'dearest'),
        option('effort', 'low'),
      ]),
    ).toMatch(/model is "dearest", not "cheapest"/u);
  });

  it('refuses an effort the Agent kept at its own default', () => {
    expect(
      costPinFailure(pin, [
        option('model', 'cheapest'),
        option('effort', 'medium'),
      ]),
    ).toMatch(/effort is "medium", not "low"/u);
  });

  it('refuses an option the Agent never reported, rather than reading silence as pinned', () => {
    expect(costPinFailure(pin, [option('model', 'cheapest')])).toMatch(
      /effort is not reported/u,
    );
  });

  it('refuses an option whose value is not one of its choices', () => {
    expect(
      costPinFailure(pin, [option('model', false), option('effort', 'low')]),
    ).toMatch(/model is false/u);
  });

  it('names every unpinned option at once, so one run shows them all', () => {
    const failure = costPinFailure(pin, []) ?? '';

    expect(failure).toMatch(/model/u);
    expect(failure).toMatch(/effort/u);
  });
});
