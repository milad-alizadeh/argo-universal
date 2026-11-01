import { projectsList, sessionRows } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import {
  flatEntries,
  listEntries,
  type ListEntriesInput,
} from './sessions-list-entries';

const firstProjectEntryId = 'project:project-1';

const secondProjectEntryId = 'project:project-2';

const [exampleProject] = projectsList;

if (!exampleProject) throw new Error('No Project mock');

const otherProject = { ...exampleProject, id: 'project-2', name: 'Other' };

const projects = [exampleProject, otherProject];

const older = { ...sessionRows.running, createdAt: 1000 };

const newer = { ...sessionRows.needsInput, createdAt: 2000 };

// Ties with `newer`, and its id sorts first.
const tiedEarlierId = { ...sessionRows.failed, createdAt: 2000 };

const entryIds = (input: ListEntriesInput): string[] =>
  listEntries(input).map((entry) => entry.id);

describe('listEntries', () => {
  it("lists each Project's Sessions under its heading, newest created first, ties by id", () => {
    expect(
      entryIds({
        projects,
        sessions: [older, newer, tiedEarlierId],
        collapsed: new Set(),
        hideEmptyProjects: false,
      }),
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
      entryIds({
        projects,
        sessions: [older],
        collapsed: new Set([firstProjectEntryId]),
        hideEmptyProjects: false,
      }),
    ).toEqual([firstProjectEntryId, secondProjectEntryId, 'empty:project-2']);
  });

  it('leaves out a Project with no Sessions when asked to', () => {
    expect(
      entryIds({
        projects,
        sessions: [older],
        collapsed: new Set(),
        hideEmptyProjects: true,
      }),
    ).toEqual([firstProjectEntryId, older.sessionId]);
  });

  it('leaves out Sessions of a Project it does not list', () => {
    expect(
      entryIds({
        projects: [otherProject],
        sessions: [older, { ...newer, projectId: otherProject.id }],
        collapsed: new Set(),
        hideEmptyProjects: false,
      }),
    ).toEqual([secondProjectEntryId, newer.sessionId]);
  });
});

describe('flatEntries', () => {
  it('lists Sessions across Projects with no headings, newest created first, ties by id', () => {
    expect(
      flatEntries({
        projects,
        sessions: [
          older,
          { ...newer, projectId: otherProject.id },
          tiedEarlierId,
        ],
      }).map((entry) => entry.id),
    ).toEqual([tiedEarlierId.sessionId, newer.sessionId, older.sessionId]);
  });

  it('leaves out Sessions of a Project it does not list', () => {
    expect(
      flatEntries({
        projects: [otherProject],
        sessions: [older, { ...newer, projectId: otherProject.id }],
      }).map((entry) => entry.id),
    ).toEqual([newer.sessionId]);
  });
});
