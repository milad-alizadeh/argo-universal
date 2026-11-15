import { describe, expect, it } from 'vitest';
import type { ChangeStageName } from './change-stage-model';
import {
  changeDescription,
  changeModifiers,
  resolveChangeStage,
} from './change-stage-model';

const stages: ChangeStageName[] = [
  'working',
  'branch',
  'open',
  'merged',
  'closed',
];

describe('Change stage', () => {
  it('names the five stages and gives each its own glyph and named tone', () => {
    expect(
      stages.map((stage) =>
        resolveChangeStage({
          stage,
        }),
      ),
    ).toEqual([
      { label: 'Working', icon: 'pencil', tone: 'neutral' },
      { label: 'Branch', icon: 'branch', tone: 'neutral' },
      { label: 'Open', icon: 'pr-open', tone: 'success' },
      { label: 'Merged', icon: 'pr-merged', tone: 'done' },
      { label: 'Closed', icon: 'pr-closed', tone: 'danger' },
    ]);
  });
});

it('gives a draft Change its own mark and writes a conflict beside an Open one', () => {
  expect(resolveChangeStage({ stage: 'open', modifier: 'draft' })).toEqual({
    label: 'Draft',
    icon: 'pr-draft',
    tone: 'neutral',
  });
  expect(resolveChangeStage({ stage: 'open', modifier: 'conflict' })).toEqual({
    label: 'Open',
    icon: 'pr-open',
    tone: 'success',
    modifier: { label: 'Conflict', tone: 'warning' },
  });
});

it('marks a draft Change that also conflicts as a draft and writes the conflict beside it', () => {
  const both = { stage: 'open', modifiers: ['conflict', 'draft'] } as const;

  expect(resolveChangeStage(both)).toMatchObject({ icon: 'pr-draft' });
  expect(changeModifiers(both).map(({ label }) => label)).toEqual(['Conflict']);
  expect(changeDescription(both)).toBe('Draft, Conflict');
});
