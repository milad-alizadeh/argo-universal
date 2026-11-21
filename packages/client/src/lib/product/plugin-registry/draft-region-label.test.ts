import { expect, it } from 'vitest';
import { regionLabel } from './draft-region-label';

it.each([
  ['list', 'Drawing · List'],
  ['list-header', 'Drawing · List header'],
  ['issue_board', 'Drawing · Issue board'],
])('labels region %s as %s', (region, label) => {
  expect(regionLabel(region)).toBe(label);
});
