import { projectsList, sessionRows } from '@repo/api/mocks';
import { describe, expect, it } from 'vitest';
import { listEntries } from './sessions-list-entries';

const [exampleProject] = projectsList;
if (!exampleProject) throw new Error('No Project mock');
const otherProject = { ...exampleProject, id: 'project-2', name: 'Other' };
const projects = [exampleProject, otherProject];

const older = { ...sessionRows.running, activityAt: 1000 };
const newer = { ...sessionRows.needsInput, activityAt: 2000 };
// Ties with `newer`, and its id sorts first.
const tiedEarlierId = { ...sessionRows.failed, activityAt: 2000 };

const entryIds = (...args: Parameters<typeof listEntries>): string[] =>
  listEntries(...args).map((entry) => entry.id);

describe('listEntries', () => {
  it("lists each Project's Sessions under its heading, newest activity first, ties by id", () => {
    expect(
      entryIds(projects, [older, newer, tiedEarlierId], new Set(), false),
    ).toEqual([
      'project:project-1',
      tiedEarlierId.sessionId,
      newer.sessionId,
      older.sessionId,
      'project:project-2',
      'empty:project-2',
    ]);
  });

  it('shows only the heading of a collapsed Project', () => {
    expect(
      entryIds(projects, [older], new Set(['project:project-1']), false),
    ).toEqual(['project:project-1', 'project:project-2', 'empty:project-2']);
  });

  it('leaves out a Project with no Sessions when asked to', () => {
    expect(entryIds(projects, [older], new Set(), true)).toEqual([
      'project:project-1',
      older.sessionId,
    ]);
  });

  it('leaves out Sessions of a Project it does not list', () => {
    expect(
      entryIds(
        [otherProject],
        [older, { ...newer, projectId: otherProject.id }],
        new Set(),
        false,
      ),
    ).toEqual(['project:project-2', newer.sessionId]);
  });
});
