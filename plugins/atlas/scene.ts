import type { PluginProps } from '@argo/plugin-kit';
import { changeIntensity, fileTone } from './measures';
import type { CodeFile, Tile } from './model';

// A file's rectangle; its short key keeps the wire small, and `path` says whose it is.
export type FileRect = PluginProps['Canvas.Rect'] & {
  key: string;
  path: string;
  label: string;
};

// A file's name drawn over its rectangle.
export type FileCaption = PluginProps['Canvas.Text'] & {
  key: string;
  x: number;
  y: number;
};

// The files a page draws, and how many of the Project's it left out.
export interface DrawnFiles {
  files: CodeFile[];
  hidden: number;
}

// A drawn page holds about 1 MiB; at the longest label a file's rectangle takes about 300 bytes.
export const maximumFiles = 2500;

// The App draws each fitting caption as its own text, so only the largest files carry one.
export const maximumCaptions = 32;

// The wire's limit on a rectangle's label.
const labelLimit = 120;

const ellipsis = '…';

const captionInset = 4;

const insetShare = 4;

// Two decimals keep the scene small on the wire and are finer than any zoom shows.
const hundredths = 100;

const round = (value: number): number =>
  Math.round(value * hundredths) / hundredths;

const largestFirst = (a: CodeFile, b: CodeFile): number => b.lines - a.lines;

// A path too long for a rectangle's label keeps its end, where the file's name is.
export function pathLabel(path: string): string {
  if (path.length <= labelLimit) return path;

  return `${ellipsis}${path.slice(path.length - labelLimit + ellipsis.length)}`;
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

// The largest files of a Project too big for one page.
export function drawnFiles(files: CodeFile[]): DrawnFiles {
  if (files.length <= maximumFiles) return { files, hidden: 0 };

  const largest = [...files].sort(largestFirst).slice(0, maximumFiles);

  return { files: largest, hidden: files.length - maximumFiles };
}

function mostTouches(tiles: Tile[]): number {
  return tiles.reduce((most, tile) => Math.max(most, tile.touches), 0);
}

// One rectangle per file: area by lines, tone by branching, shade by recent changes.
export function fileRects(tiles: Tile[]): FileRect[] {
  const most = mostTouches(tiles);

  return tiles.map((tile, index) => ({
    key: `f${index}`,
    path: tile.path,
    label: pathLabel(tile.path),
    x: round(tile.x),
    y: round(tile.y),
    width: round(tile.w),
    height: round(tile.h),
    tone: fileTone(tile),
    intensity: round(changeIntensity(tile, most)),
  }));
}

// Set a little inside the tile, so the App fits the caption to that tile.
function caption(tile: Tile, index: number): FileCaption {
  const inset = Math.min(
    captionInset,
    tile.w / insetShare,
    tile.h / insetShare,
  );

  return {
    key: `c${index}`,
    x: round(tile.x + inset),
    y: round(tile.y + inset),
    text: fileName(tile.path),
    tone: 'neutral',
  };
}

// The largest files' names.
export function fileCaptions(tiles: Tile[]): FileCaption[] {
  return [...tiles].sort(largestFirst).slice(0, maximumCaptions).map(caption);
}
