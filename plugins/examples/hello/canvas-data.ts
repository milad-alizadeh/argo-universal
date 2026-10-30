import type { PluginProps } from '@argo/plugin-kit';

type RectProps = PluginProps['Canvas.Rect'];

type Select = (key: string) => void;

type Area = (typeof areas)[number];

type Day = (typeof days)[number];

type Rect = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: RectProps['intensity'];
  tone: RectProps['tone'];
  label?: string;
};

const columns = 12;

const rows = 7;

export const grid = {
  inset: 8,
  step: 29,
  columnWeight: 3,
  rowWeight: 5,
  half: 0.5,
  lowBuilds: 6,
  highBuilds: 12,
  keyPrefix: 4,
};

const tiles = { padding: 16, header: 42, inset: 6, top: 32, gap: 4, levels: 3 };

const levels = { eighth: 0.125, quarter: 0.25, third: 0.375 };

const shades = [0, levels.eighth, levels.quarter, levels.third, grid.half, 1];

export const days = Array.from({ length: columns * rows }, (_, index) => ({
  key: `day-${index}`,
  x: grid.inset + Math.floor(index / rows) * grid.step,
  y: grid.inset + (index % rows) * grid.step,
  intensity:
    shades[
      (Math.floor(index / rows) * grid.columnWeight +
        (index % rows) * grid.rowWeight +
        Math.floor(index / rows) * (index % rows)) %
        shades.length
    ],
}));

export const areas = [
  {
    key: 'packages',
    shadeOffset: 0,
    x: 8,
    y: 8,
    width: 205,
    height: 200,
    files: 9,
    columns: 3,
  },
  {
    key: 'apps',
    shadeOffset: 1,
    x: 217,
    y: 8,
    width: 135,
    height: 116,
    files: 4,
    columns: 2,
  },
  {
    key: 'plugins',
    shadeOffset: 2,
    x: 217,
    y: 128,
    width: 135,
    height: 80,
    files: 4,
    columns: 2,
  },
];

function files(area: Area): Omit<Rect, 'tone'>[] {
  const width = (area.width - tiles.padding) / area.columns;

  const height =
    (area.height - tiles.header) / Math.ceil(area.files / area.columns);

  return Array.from({ length: area.files }, (_, index) => ({
    key: `${area.key}-${index}`,
    x: area.x + tiles.inset + (index % area.columns) * width,
    y: area.y + tiles.top + Math.floor(index / area.columns) * height,
    width: width - tiles.gap,
    height: height - tiles.gap,
    intensity: shades[((index + area.shadeOffset) % tiles.levels) + 1],
    label: `${area.key}/file-${index}.ts`,
  }));
}

const sceneFrame = {
  width: 360,
  height: 216,
  camera: 'pan-zoom',
} as const;

const allFiles = areas.flatMap(files);

export const rectangles: Rect[] = [
  ...areas.map(backgroundProps),
  ...allFiles.map((file): Rect => ({ ...file, tone: 'accent' })),
];

const dayTile = { width: 25, height: 25, rx: 3, tone: 'accent' } as const;

function dayLabel(key: string, intensity: number): string {
  if (key !== 'day-44') return `Day ${key.slice(grid.keyPrefix)}`;
  const builds = intensity === grid.half ? grid.lowBuilds : grid.highBuilds;

  return `Day 44: ${builds} builds`;
}

export function dayProps(
  day: Day,
  intensity: number,
  onSelect: Select,
): RectProps {
  const { key, ...drawing } = day;

  return {
    ...drawing,
    ...dayTile,
    intensity: key === 'day-44' ? intensity : day.intensity,
    label: dayLabel(key, intensity),
    onPress: () => onSelect(key),
  };
}

function backgroundProps(area: Area): Rect {
  const { key, x, y, width, height } = area;

  return { key, x, y, width, height, tone: 'muted', intensity: 0 };
}

export function fileProps(file: Rect, onSelect: Select): RectProps {
  const { key, ...drawing } = file;

  return {
    ...drawing,
    tone: 'accent',
    onPress: file.label ? () => onSelect(key) : undefined,
  };
}

export function areaLabel(area: Area): PluginProps['Canvas.Text'] {
  return {
    x: area.x + grid.inset,
    y: area.y + tiles.gap,
    text: area.key,
    tone: 'neutral',
  };
}

export function sceneProps(
  label: string,
  selectedKey: string,
): PluginProps['Canvas'] {
  return { ...sceneFrame, label, selectedKey };
}
