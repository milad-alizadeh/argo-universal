import { draftRegionLabel } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import { regionLabel } from './draft-region-label';

it.each([
  ['list', 'Drawing · List'],
  ['list-header', 'Drawing · List-header'],
  ['issue_board', 'Drawing · Issue_board'],
])('labels region %s as %s', (region, label) => {
  expect(regionLabel(region)).toBe(label);
});

it.each(['list', 'side-bar', 'issue_board'])(
  'titles the frame of region %s with the same label as its tag',
  (region) => {
    expect(regionLabel(region)).toBe(`Drawing · ${draftRegionLabel(region)}`);
  },
);
