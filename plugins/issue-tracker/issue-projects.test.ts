import { describe, expect, it, vi } from 'vitest';
import { createIssueProjects } from './issue-projects';

const project = { id: 'project-1', name: 'One', originUrl: null };

const listing = () => {
  const list = vi.fn(() => Promise.resolve([project]));

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
      .fn()
      .mockResolvedValueOnce([project])
      .mockRejectedValueOnce(new Error('no'));
    const projects = createIssueProjects(list);

    await projects.refresh();
    await projects.refresh();

    expect(projects.read()).toEqual({ projects: [project], failed: true });
  });

  it('tells its readers when a page chooses another Project', () => {
    const { projects } = listing();
    const told = vi.fn();

    projects.subscribe(told);
    projects.choose('project-2');
    projects.choose('project-2');

    expect(projects.chosenId()).toBe('project-2');
    expect(told).toHaveBeenCalledTimes(1);
  });
});
