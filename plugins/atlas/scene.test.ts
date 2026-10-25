import { describe, expect, it } from 'vitest';
import { layout } from './layout/treemap';
import type { Bounds, CodeFile, Tile } from './model';
import {
  drawnFiles,
  fileCaptions,
  fileRects,
  maximumCaptions,
  maximumFiles,
  pathLabel,
  type FileCaption,
} from './scene';

const app = 'src/app.ts';

function file(path: string, lines: number): CodeFile {
  return { path, lines, branches: 0, touches: 0 };
}

const numbered = (count: number): CodeFile[] =>
  Array.from({ length: count }, (_, index) =>
    file(`src/file-${index}.ts`, index + 1),
  );

const paths = (files: CodeFile[]): string[] => files.map(({ path }) => path);

const many = numbered(maximumCaptions + 10);

const within = (value: number, start: number, size: number): boolean =>
  value > start && value < start + size;

const anchoredIn = (caption: FileCaption, tile: Bounds): boolean =>
  within(caption.x, tile.x, tile.w) && within(caption.y, tile.y, tile.h);

describe('Drawn files', () => {
  it('draws every file of a Project that fits', () => {
    expect(drawnFiles(many)).toEqual({ files: many, hidden: 0 });
  });

  it('draws only the largest files of a Project too big for one page', () => {
    const drawn = drawnFiles(numbered(maximumFiles + 5));

    expect(drawn.hidden).toBe(5);
    expect(paths(drawn.files)).not.toContain('src/file-0.ts');
    expect(paths(drawn.files)).toContain(`src/file-${maximumFiles + 4}.ts`);
  });
});

describe('File rectangles', () => {
  it('gives each file its own key and remembers whose it is', () => {
    const tiles = layout([file(app, 10), file('README.md', 4)]);
    const rects = fileRects(tiles);

    expect(new Set(rects.map(({ key }) => key)).size).toBe(2);
    expect(rects.map(({ path }) => path)).toEqual(paths(tiles));
  });

  it('names each file by its path for the tooltip and the screen reader list', () => {
    const rects = fileRects(layout([file(app, 10)]));

    expect(rects.map(({ label }) => label)).toEqual([app]);
  });

  it('keeps the end of a path too long for a label', () => {
    const label = pathLabel(`${'deep/'.repeat(30)}file.ts`);

    expect(label.length).toBeLessThanOrEqual(120);
    expect(label.endsWith('deep/file.ts')).toBe(true);
  });
});

describe('Captions', () => {
  const tiles = layout(many);

  it('captions at most the largest files, by file name', () => {
    const largest = paths(
      [...many].sort((a, b) => b.lines - a.lines).slice(0, maximumCaptions),
    ).map((path) => path.slice('src/'.length));

    const captions = fileCaptions(tiles).map(({ text }) => text);

    expect(captions.sort()).toEqual(largest.sort());
  });

  it('gives each caption its own key', () => {
    const keys = fileCaptions(tiles).map(({ key }) => key);

    expect(new Set(keys).size).toBe(maximumCaptions);
  });

  it('anchors each caption inside its own file', () => {
    const byName = new Map(
      tiles.map((tile): [string, Tile] => [
        tile.path.slice('src/'.length),
        tile,
      ]),
    );

    const outside = fileCaptions(tiles).filter((caption) => {
      const tile = byName.get(caption.text);

      return !tile || !anchoredIn(caption, tile);
    });

    expect(outside).toEqual([]);
  });
});
