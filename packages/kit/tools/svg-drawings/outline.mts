import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

/*
 * An Android drawing of an SVG icon as filled outlines (ADR-0041). Expo UI reads a vector drawable's fill and
 * ignores its stroke, so the stroked paths of a component in `svg-symbols` are widened here to the outline a
 * 2-point round stroke covers, and the drawing fills that outline.
 */

// The part of CanvasKit this reads; its own types are not a dependency of the kit.
interface Outline {
  toSVGString: () => string;
  delete: () => void;
}

interface Stroke {
  width: number;
  cap: unknown;
  join: unknown;
}

interface SourcePath extends Outline {
  makeStroked: (stroke: Stroke) => Outline | null;
}

interface CanvasKit {
  Path: { MakeFromSVGString: (d: string) => SourcePath | null };
  StrokeCap: { Round: unknown };
  StrokeJoin: { Round: unknown };
}

type CanvasKitInit = (options: {
  locateFile: (file: string) => string;
}) => Promise<CanvasKit>;

const require = createRequire(import.meta.url);

const skiaRequire = createRequire(
  require.resolve('@shopify/react-native-skia/package.json'),
);

const canvasKitPath = skiaRequire.resolve(
  'canvaskit-wasm/bin/full/canvaskit.js',
);

const symbolsDirectory = new URL('../../src/symbols/', import.meta.url);

const componentsDirectory = new URL('svg-symbols/', symbolsDirectory);

// The drawings of every SVG icon but file-diff sit in one folder; file-diff predates it and sits in assets.
export const drawingFile = (name: string): URL =>
  name === 'file-diff'
    ? new URL('assets/file-diff.xml', symbolsDirectory)
    : new URL(`assets/svg-drawings/${name}.xml`, symbolsDirectory);

const roundingFactor = 100;

const roundNumber = (number: string): string =>
  String(Math.round(Number(number) * roundingFactor) / roundingFactor);

const rounded = (outline: string): string =>
  outline
    .split(/([A-Z\s])/u)
    .map((token) => (token.includes('.') ? roundNumber(token) : token))
    .join('');

function loadCanvasKit(): Promise<CanvasKit> {
  const init: CanvasKitInit = require(canvasKitPath);

  return init({ locateFile: (file) => `${dirname(canvasKitPath)}/${file}` });
}

let loaded: Promise<CanvasKit> | undefined;

const canvasKit = (): Promise<CanvasKit> => (loaded ??= loadCanvasKit());

// The `d` of each <Path> of a component, in order.
export async function componentPaths(name: string): Promise<string[]> {
  const source = await readFile(
    new URL(`${name}.tsx`, componentsDirectory),
    'utf8',
  );

  return [...source.matchAll(/<Path d="([^"]*)"/gu)].map(([, d]) => d ?? '');
}

function readPath(kit: CanvasKit, d: string): SourcePath {
  const path = kit.Path.MakeFromSVGString(d);

  if (!path) throw new Error(`Cannot read the path ${d}`);

  return path;
}

// One path widened to the outline of a 2-point round stroke.
function widen(kit: CanvasKit, d: string): string {
  const path = readPath(kit, d);

  try {
    return rounded(strokedSvg(kit, path, d));
  } finally {
    path.delete();
  }
}

function strokedSvg(kit: CanvasKit, path: SourcePath, d: string): string {
  const widened = path.makeStroked({
    width: 2,
    cap: kit.StrokeCap.Round,
    join: kit.StrokeJoin.Round,
  });

  if (!widened) throw new Error(`Cannot outline the path ${d}`);

  try {
    return widened.toSVGString();
  } finally {
    widened.delete();
  }
}

export async function outlineOf(paths: string[]): Promise<string> {
  const kit = await canvasKit();

  return paths.map((d) => widen(kit, d)).join('');
}

// The outline a drawing file fills, or undefined when the file has none.
export async function drawnOutline(name: string): Promise<string | undefined> {
  const xml = await readFile(drawingFile(name), 'utf8');

  return /android:pathData="([^"]+)"/u.exec(xml)?.[1];
}

export const drawingXml = (
  outline: string,
): string => `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="@android:color/white"
      android:pathData="${outline}" />
</vector>
`;

export async function componentNames(): Promise<string[]> {
  const files = await readdir(componentsDirectory);

  return files
    .filter((file) => file.endsWith('.tsx') && !file.startsWith('svg-symbol-'))
    .map((file) => file.replace(/\.tsx$/u, ''))
    .toSorted();
}
