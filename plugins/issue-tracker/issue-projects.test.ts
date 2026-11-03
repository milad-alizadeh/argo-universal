import type { Argo } from '@argo/plugin-kit';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { createIssueProjects, type IssueProjects } from './issue-projects';

type List = Argo['projects']['list'];

interface Listing {
  list: Mock<List>;
  projects: IssueProjects;
}

const project = { id: 'project-1', name: 'One', originUrl: null };

const listing = (): Listing => {
  const list = vi.fn<List>(() => Promise.resolve([project]));

  return { list, projects: createIssueProjects(list) };
};

describe('the section’s Projects', () => {
  it('lists once however many pages ask for the known ones', async () => {
    const { list, projects } = listing();

    await Promise.all([projects.known(), projects.known(), projects.refresh()]);
    await projects.known();

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('lists again when refreshed', async () => {
    const { list, projects } = listing();

    await projects.refresh();
    await projects.refresh();

    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the known Projects when a refresh fails', async () => {
    const list = vi
      .fn<List>()
      .mockResolvedValueOnce([project])
      .mockRejectedValueOnce(new Error('no'));

    const projects = createIssueProjects(list);

    await projects.refresh();
    await projects.refresh();

    expect(projects.read()).toEqual({ projects: [project], failed: true });
  });

  it('tells its readers when a page chooses another Project', () => {
    const { projects } = listing();
    const told = vi.fn<() => void>();

    projects.subscribe(told);
    projects.choose('app-1', 'project-2');
    projects.choose('app-1', 'project-2');

    expect(projects.chosenId('app-1')).toBe('project-2');
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('keeps each App’s choice apart', () => {
    const { projects } = listing();

    projects.choose('app-1', 'project-2');
    projects.choose('app-2', 'project-3');

    expect(projects.chosenId('app-1')).toBe('project-2');
    expect(projects.chosenId('app-2')).toBe('project-3');
  });
});
