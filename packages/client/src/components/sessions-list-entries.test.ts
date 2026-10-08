import { projectsList, sessionRows } from '@repo/api/mocks';
import { describe, expect, it } from 'vitest';
import { listEntries } from './sessions-list-entries';

const firstProjectEntryId = 'project:project-1';
const secondProjectEntryId = 'project:project-2';

const [exampleProject] = projectsList;
if (!exampleProject) throw new Error('No Project mock');
const otherProject = { ...exampleProject, id: 'project-2', name: 'Other' };
const projects = [exampleProject, otherProject];

const older = { ...sessionRows.running, activityAt: 1000 };
const newer = { ...sessionRows.needsInput, activityAt: 2000 };
// Ties with `newer`, and its id sorts first.
const tiedEarlierId = { ...sessionRows.failed, activityAt: 2000 };

const entryIds = (...args: Parameters<typeof listEntries>) =>
  listEntries(...args).map((entry) => entry.id);

describe('listEntries', () => {
  it("lists each Project's Sessions under its heading, newest activity first, ties by id", () => {
    expect(
      entryIds(projects, [older, newer, tiedEarlierId], new Set(), false),
    ).toEqual([
      firstProjectEntryId,
      tiedEarlierId.sessionId,
      newer.sessionId,
      older.sessionId,
      secondProjectEntryId,
      'empty:project-2',
    ]);
  });

  it('shows only the heading of a collapsed Project', () => {
    expect(
      entryIds(projects, [older], new Set([firstProjectEntryId]), false),
    ).toEqual([firstProjectEntryId, secondProjectEntryId, 'empty:project-2']);
  });

  it('leaves out a Project with no Sessions when asked to', () => {
    expect(entryIds(projects, [older], new Set(), true)).toEqual([
      firstProjectEntryId,
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
    ).toEqual([secondProjectEntryId, newer.sessionId]);
  });
});
