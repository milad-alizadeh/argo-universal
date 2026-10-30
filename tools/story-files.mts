import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { storySuffix, type StoryFile } from './story-file.mts';
import { root, trackedFiles } from './tracked-files.mts';

/*
 * Every file the pathspecs match in the working tree, tracked or not. A story written but not yet
 * `git add`ed is checked as the commit will hold it, so a gate cannot pass locally and fail once
 * the file is added.
 */
export const loadSources = (pathspecs: readonly string[]): StoryFile[] =>
  trackedFiles(pathspecs, { untracked: true }).map((file): StoryFile => ({
    file,
    source: readFileSync(resolve(root, file), 'utf8'),
  }));

export const loadStoryFiles = (
  pathspecs: readonly string[] = [`*${storySuffix}`],
): StoryFile[] => loadSources(pathspecs);
