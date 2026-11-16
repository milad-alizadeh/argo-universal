import { expect, it } from 'vitest';
import { listed, shown } from './mocks/issue-journey';

const timeoutMs = 20_000;

const renamedTitle = 'Filed before ARGO was renamed';

/*
 * Jira still answers an issue by the key it had before its project's key changed, and names the project it is in
 * now. The page reads the choices of that project, which the list already read, not the key's prefix.
 */
it(
  'opens an issue whose key names a renamed project from its row, with no Jira call',
  async () => {
    const jira = await listed();

    jira.jira.data.sites[0]?.projects[0]?.issues.unshift({
      key: 'OLD-7',
      summary: renamedTitle,
      status: { name: 'To Do', category: 'new' },
      assignee: null,
      priority: 'Low',
    });
    // The list reads Jira again within a minute, and sees the issue.
    await jira.test.clock.advance(60_000);
    await jira.list.draw();

    const asked = jira.jira.requests.length;
    const page = await jira.list.press(renamedTitle);

    expect(jira.jira.requests).toHaveLength(asked);
    expect(shown(page)).toEqual({
      status: 'To Do',
      assignee: 'Unassigned',
      priority: 'Low',
    });
  },
  timeoutMs,
);
