import type { RectProps } from './canvas-props';

const daySize = { width: 25, height: 25, rx: 3 };

const shades = [0, 0.125, 0.25, 0.375, 0.5, 1];

export const days = Array.from({ length: 84 }, (_, index) => day(index));

function day(index: number): RectProps & { key: string } {
  const column = Math.floor(index / 7);
  const row = index % 7;

  return {
    key: `day-${index}`,
    x: 8 + column * 29,
    y: 8 + row * 29,
    ...daySize,
    tone: 'accent',
    intensity: shades[(column * 3 + row * 5 + column * row) % shades.length],
    label: `Day ${index}`,
  } as const;
}

const groups = [
  {
    key: 'packages',
    shadeOffset: 0,
    x: 8,
    y: 8,
    width: 205,
    height: 200,
    count: 9,
    columns: 3,
  },
  {
    key: 'apps',
    shadeOffset: 1,
    x: 217,
    y: 8,
    width: 135,
    height: 116,
    count: 4,
    columns: 2,
  },
  {
    key: 'plugins',
    shadeOffset: 2,
    x: 217,
    y: 128,
    width: 135,
    height: 80,
    count: 4,
    columns: 2,
  },
] as const;

export const areas = groups.map(
  (area) => ({ ...area, tone: 'muted', intensity: 0 }) as const,
);

export const labels = groups.map(
  (area) =>
    ({
      key: area.key,
      x: area.x + 8,
      y: area.y + 4,
      text: area.key,
      tone: 'neutral',
    }) as const,
);

export const files = groups.flatMap((area) =>
  Array.from({ length: area.count }, (_, index) => file(area, index)),
);

function file(
  area: (typeof groups)[number],
  index: number,
): RectProps & { key: string } {
  const width = (area.width - 16) / area.columns;
  const height = (area.height - 42) / Math.ceil(area.count / area.columns);

  return {
    key: `${area.key}-${index}`,
    x: area.x + 6 + (index % area.columns) * width,
    y: area.y + 32 + Math.floor(index / area.columns) * height,
    ...tileSize(width, height),
    tone: 'accent',
    ...fileLabel(area.key, index, area.shadeOffset),
  } as const;
}

export const rectangles = [...areas, ...files];

function tileSize(
  width: number,
  height: number,
): Pick<RectProps, 'width' | 'height'> {
  return { width: width - 4, height: height - 4 };
}

function fileLabel(
  key: string,
  index: number,
  shadeOffset: number,
): Pick<RectProps, 'intensity' | 'label'> {
  return {
    intensity: shades[((index + shadeOffset) % 3) + 1],
    label: `${key}/file-${index}.ts`,
  };
}
