import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  argoIssues,
  filterBy,
  filterCount,
  isChosen,
  lastJql,
  listEmpty,
} from './mocks/listing';

const timeoutMs = 30_000;

const screen = (node: WireNode): boolean => node.type === 'Screen';

// The Actions of one of the Screen's slots, by their labels, a Section's under it.
const slotLabels = (page: OpenPage, slot: string): unknown[] =>
  (page.find(screen).slots[slot] ?? []).flatMap((each) =>
    each.type === 'Action.Section'
      ? each.children.map((action) => action.props.label)
      : [each.props.label],
  );

const titleChoice =
  (label: string) =>
  (node: WireNode): boolean =>
    node.type === 'Action' && node.props.label === label;

it(
  'keeps the header to the title, Options and Search: the title picks the project and the overflow menu is gone',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);
    const { props } = page.find(screen);

    expect(props.title).toBe('Argo');
    expect(props.caption).toBe('ARGO · arena.atlassian.net');
    expect(slotLabels(page, 'actions')).toEqual([]);
    expect(slotLabels(page, 'titleMenu')).toEqual([
      'Argo',
      'Quiet project',
      'Change Jira site…',
    ]);
    expect(page.find(titleChoice('Argo')).props.selected).toBe(true);
    expect(page.find(titleChoice('Quiet project')).props.selected).toBe(false);

    await page.press(titleChoice('Quiet project'));

    expect(page.find(screen).props.title).toBe('Quiet project');
    expect(listEmpty(page).props.title).toBe('No issues in QUIET');

    const site = await page.press('Change Jira site…');

    expect(site.path).toBe(`${page.path}/site`);
  },
  timeoutMs,
);

it(
  'orders the list from the Options, which the badge does not count and Clear filters keeps',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    expect(isChosen(page, 'Recently updated')).toBe(true);
    expect(lastJql(jira)).toMatch(/ ORDER BY updated DESC$/u);

    await filterBy(page, 'Newest');

    expect(lastJql(jira)).toMatch(/ ORDER BY created DESC$/u);
    expect(filterCount(page)).toBe(0);

    await filterBy(page, 'Priority');
    await filterBy(page, 'Unassigned');
    await filterBy(page, 'Done');

    expect(lastJql(jira)).toMatch(/ ORDER BY priority DESC, updated DESC$/u);
    expect(filterCount(page)).toBe(2);

    await page.press('Clear filters');

    expect(filterCount(page)).toBe(0);
    expect(isChosen(page, 'Priority')).toBe(true);
  },
  timeoutMs,
);
