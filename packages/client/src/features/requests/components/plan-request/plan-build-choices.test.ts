import { describe, expect, it } from 'vitest';
import { buildChoices, buildInNewSession } from './plan-build-choices';

const once = {
  optionId: 'exit-plan-default',
  name: 'Yes, manually approve edits',
  kind: 'allow_once',
} as const;

const always = {
  optionId: 'exit-plan-accept-edits',
  name: 'Yes, auto-accept edits',
  kind: 'allow_always',
} as const;

describe('buildChoices', () => {
  it('names each allow option as a way to build, then a new Session', () => {
    expect(buildChoices([once, always], true)).toEqual([
      { value: once.optionId, label: 'Build' },
      { value: always.optionId, label: 'Build, auto-accept edits' },
      buildInNewSession,
    ]);
  });

  it('keeps the Agent names of options of one kind', () => {
    const other = { ...once, optionId: 'other', name: 'Yes, in a sandbox' };

    expect(buildChoices([once, other], false)).toEqual([
      { value: once.optionId, label: once.name },
      { value: other.optionId, label: other.name },
    ]);
  });
});
