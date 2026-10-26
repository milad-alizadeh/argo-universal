import { expect, it } from 'vitest';
import {
  follow,
  issuesRoot,
  issueTitle,
  linkedPage,
  wait,
  type PageView,
} from './journey-fixture';

const shownValue = (view: PageView, text: string): string => {
  const value = view.findText(text)?.node.props.value;

  return typeof value === 'string' ? value : '';
};

it('groups Issues by status, by you and by label, each with its own list', async () => {
  const { root } = await issuesRoot();

  await expect.poll(() => shownValue(root, 'Open'), wait).toBe('2');
  expect(shownValue(root, 'Closed')).toBe('0');
  expect(root.findText('Assigned to you')).toBeDefined();
  await expect
    .poll(() => root.findText('good first issue'), wait)
    .toBeDefined();
  expect(root.findText(issueTitle)).toBeUndefined();
  expect(linkedPage(root, 'good first issue')).toBe(
    '/projects/project-1/filters/label-good_20_first_20_issue',
  );
}, 20_000);

it('opens a filter list, then an Issue from it, on their own pages', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(JSON.stringify(list.tree)).toContain('"color":"#d73a4a"');

  const detail = await follow(test, list, issueTitle);

  // Detail draws the body as `markdown`, which `findText` does not read.
  await expect
    .poll(
      () =>
        JSON.stringify(detail.tree).includes(
          'This Issue came from the fixture gh executable.',
        ),
      wait,
    )
    .toBe(true);
  expect(detail.findText('Open in GitHub')?.node.props.onPress).toEqual({
    action: 'openUrl',
    url: 'https://github.com/owner/repository/issues/42',
  });
  expect(await test.log()).not.toContain('refused');
}, 20_000);

it('shows an empty list for a filter with no Issues', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Closed');

  await expect.poll(() => list.findText('No Issues.'), wait).toBeDefined();
}, 20_000);
