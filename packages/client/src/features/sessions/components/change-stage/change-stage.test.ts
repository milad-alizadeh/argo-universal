import { describe, expect, it } from 'vitest';
import type { ChangeStageName } from './change-stage-model';
import { resolveChangeStage } from './change-stage-model';

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

it('keeps draft and conflicted Changes Open and describes each modifier separately', () => {
  expect(resolveChangeStage({ stage: 'open', modifier: 'draft' })).toEqual({
    label: 'Open',
    icon: 'pr-open',
    tone: 'success',
    modifier: { label: 'Draft', tone: 'muted' },
  });
  expect(resolveChangeStage({ stage: 'open', modifier: 'conflict' })).toEqual({
    label: 'Open',
    icon: 'pr-open',
    tone: 'success',
    modifier: { label: 'Conflict', tone: 'warning' },
  });
});
