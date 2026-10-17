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

const older = { ...sessionRows.running, activityAt: 1000 };

const newer = { ...sessionRows.needsInput, activityAt: 2000 };

// Ties with `newer`, and its id sorts first.
const tiedEarlierId = { ...sessionRows.failed, activityAt: 2000 };

const entryIds = (input: ListEntriesInput): string[] =>
  listEntries(input).map((entry) => entry.id);

describe('listEntries', () => {
  it("lists each Project's Sessions under its heading, newest activity first, ties by id", () => {
    expect(
      entryIds({
        projects,
        sessions: [older, newer, tiedEarlierId],
        collapsed: new Set(),
        hideEmptyProjects: false,
        order: 'activity',
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

  it("lists each Project's Sessions newest created first when ordered by Created, ties by id", () => {
    expect(
      entryIds({
        projects,
        sessions: [
          { ...older, createdAt: 3000 },
          { ...newer, createdAt: 1000 },
          { ...tiedEarlierId, createdAt: 1000 },
        ],
        collapsed: new Set(),
        hideEmptyProjects: true,
        order: 'created',
      }),
    ).toEqual([
      firstProjectEntryId,
      older.sessionId,
      tiedEarlierId.sessionId,
      newer.sessionId,
    ]);
  });

  it("marks the first and last of each Project's Sessions", () => {
    const places = listEntries({
      projects,
      sessions: [older, newer, { ...tiedEarlierId, projectId: 'project-2' }],
      collapsed: new Set(),
      hideEmptyProjects: false,
      order: 'activity',
    }).flatMap((entry) =>
      entry.kind === 'session' ? [[entry.id, entry.first, entry.last]] : [],
    );

    expect(places).toEqual([
      [newer.sessionId, true, false],
      [older.sessionId, false, true],
      [tiedEarlierId.sessionId, true, true],
    ]);
  });

  it('shows only the heading of a collapsed Project', () => {
    expect(
      entryIds({
        projects,
        sessions: [older],
        collapsed: new Set([firstProjectEntryId]),
        hideEmptyProjects: false,
        order: 'activity',
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
        order: 'activity',
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
        order: 'activity',
      }),
    ).toEqual([secondProjectEntryId, newer.sessionId]);
  });
});

describe('flatEntries', () => {
  it('lists Sessions across Projects with no headings, newest activity first, ties by id', () => {
    expect(
      flatEntries({
        projects,
        sessions: [
          older,
          { ...newer, projectId: otherProject.id },
          tiedEarlierId,
        ],
        order: 'activity',
      }).map((entry) => entry.id),
    ).toEqual([tiedEarlierId.sessionId, newer.sessionId, older.sessionId]);
  });

  it('lists Sessions across Projects newest created first when ordered by Created', () => {
    expect(
      flatEntries({
        projects,
        sessions: [
          { ...older, createdAt: 3000 },
          { ...newer, projectId: otherProject.id, createdAt: 2000 },
          { ...tiedEarlierId, createdAt: 1000 },
        ],
        order: 'created',
      }).map((entry) => entry.id),
    ).toEqual([older.sessionId, newer.sessionId, tiedEarlierId.sessionId]);
  });

  it('leaves out Sessions of a Project it does not list', () => {
    expect(
      flatEntries({
        projects: [otherProject],
        sessions: [older, { ...newer, projectId: otherProject.id }],
        order: 'activity',
      }).map((entry) => entry.id),
    ).toEqual([newer.sessionId]);
  });
});
