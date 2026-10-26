import { expect, it } from 'vitest';
import { labelFilter } from './issue-filters';
import { filterPath, issuePath, pathSegment } from './issue-paths';

it.each([
  ['bug', 'bug'],
  ['good first issue', 'good_20_first_20_issue'],
  ['type: bug', 'type_3a__20_bug'],
  ['a_b', 'a_5f_b'],
])('keeps label %s inside a page path as %s', (name, segment) => {
  expect(pathSegment(name)).toBe(segment);
});

it("names a Project's filter and Issue pages", () => {
  expect(filterPath('project 1', labelFilter('good first issue'))).toBe(
    '/projects/project_20_1/filters/label-good_20_first_20_issue',
  );
  expect(issuePath('project-1', 42)).toBe('/projects/project-1/issues/42');
});

it('lists a label as its open Issues', () => {
  expect(labelFilter('help wanted').search).toBe('is:open label:"help wanted"');
});
