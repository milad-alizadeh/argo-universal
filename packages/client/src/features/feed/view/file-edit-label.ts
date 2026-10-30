import type { FileDiff } from './file-diff';

// The verb a change to one file reads as, drawn at the head of its row and spoken at the head of its label.
export const editVerbs = {
  modify: 'Edited',
  add: 'Added',
  delete: 'Deleted',
  move: 'Moved',
} as const;

// The name a path ends in: what a row draws, and all a screen reader needs of a worktree path hundreds of characters long.
export const fileName = (path: string): string =>
  path.split('/').at(-1) ?? path;

const countWords = (file: FileDiff): string[] => [
  ...(file.added > 0 ? [`plus ${file.added}`] : []),
  ...(file.removed > 0 ? [`minus ${file.removed}`] : []),
];

// A move draws both names, the old one first, as the row does.
const fileWords = (file: FileDiff): string =>
  file.oldPath
    ? `${fileName(file.oldPath)} to ${fileName(file.path)}`
    : fileName(file.path);

/*
 * What a Feed row saying "Added notes.md +1" announces (#1504). The drawn signs are read as words, since a screen
 * reader says nothing at all for "+" and "−".
 */
export function fileEditLabel(file: FileDiff): string {
  const head = `${editVerbs[file.operation]} ${fileWords(file)}`;

  return [head, ...countWords(file)].join(', ');
}
