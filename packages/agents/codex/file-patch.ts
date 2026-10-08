import type { FileUpdateChange } from './protocol.gen';
export const destinationPath = (change: FileUpdateChange): string =>
  (change.kind.type === 'update' && change.kind.move_path) || change.path;
const octalRadix = 8;
const octalEscapeDigits = 3;
const escapePathCharacter = (character: string): string => {
  if (character === '"' || character === '\\') return `\\${character}`;
  return `\\${character.charCodeAt(0).toString(octalRadix).padStart(octalEscapeDigits, '0')}`;
};
const quotePath = (filePath: string): string => {
  const escaped = filePath.replaceAll(
    // oxlint-disable-next-line no-control-regex -- Git pathnames encode control characters with octal escapes.
    /[\x00-\x20"\\\x7f]/g,
    escapePathCharacter,
  );
  return escaped === filePath ? filePath : `"${escaped}"`;
};
interface PatchPaths {
  oldPath: string;
  newPath: string;
  oldFile: string;
  newFile: string;
  header: string;
}
const patchPaths = (change: FileUpdateChange): PatchPaths => {
  const oldPath = change.path.replace(/^\//, '');
  const newPath = destinationPath(change).replace(/^\//, '');
  const oldFile = quotePath(`a/${oldPath}`);
  const newFile = quotePath(`b/${newPath}`);
  return {
    oldPath,
    newPath,
    oldFile,
    newFile,
    header: `diff --git ${oldFile} ${newFile}\n`,
  };
};
const renameHeader = ({ oldPath, newPath }: PatchPaths): string =>
  oldPath === newPath
    ? ''
    : `rename from ${quotePath(oldPath)}\nrename to ${quotePath(newPath)}\n`;
const updatePatch = (change: FileUpdateChange): string => {
  const { oldFile, newFile, header } = patchPaths(change);
  const rename = renameHeader(patchPaths(change));
  if (!change.diff) return rename ? header + rename : '';
  return `${header}${rename}--- ${oldFile}\n+++ ${newFile}\n${change.diff}`;
};
const patchLines = (diff: string): { lines: string[]; ending: string } => {
  const lines = diff.split('\n');
  const finalNewline = lines.at(-1) === '';
  if (finalNewline) lines.pop();
  return {
    lines,
    ending: finalNewline ? '' : '\\ No newline at end of file\n',
  };
};
const patchHunk = (change: FileUpdateChange): string => {
  const adding = change.kind.type === 'add';
  const { lines, ending } = patchLines(change.diff);
  const range = `1,${lines.length}`;
  const [oldRange, newRange] = adding ? ['0,0', range] : [range, '0,0'];
  const sign = adding ? '+' : '-';
  return `@@ -${oldRange} +${newRange} @@\n${lines.map((line): string => sign + line).join('\n')}\n${ending}`;
};
const fileMode = (change: FileUpdateChange): string =>
  `${change.kind.type === 'add' ? 'new' : 'deleted'} file mode 100644\n`;
const oldMarker = (change: FileUpdateChange, path: string): string =>
  change.kind.type === 'add' ? '/dev/null' : path;
const newMarker = (change: FileUpdateChange, path: string): string =>
  change.kind.type === 'add' ? path : '/dev/null';
const completeFilePatch = (change: FileUpdateChange): string => {
  const { oldFile, newFile, header } = patchPaths(change);
  const metadata = fileMode(change);
  if (!change.diff) return header + metadata;
  return `${header}${metadata}--- ${oldMarker(change, oldFile)}\n+++ ${newMarker(change, newFile)}\n${patchHunk(change)}`;
};
export const patchOf = (change: FileUpdateChange): string =>
  change.kind.type === 'update'
    ? updatePatch(change)
    : completeFilePatch(change);
