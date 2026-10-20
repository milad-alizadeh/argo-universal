import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Rectangle } from 'electron';
import { z } from 'zod';

const rectangle = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const windowState = z.object({
  bounds: rectangle,
  maximized: z.boolean(),
});

export type WindowState = z.infer<typeof windowState>;

export const defaultWidth = 1400;

export const defaultHeight = 900;

const minimumWidth = 600;

const minimumHeight = 300;

const fileError = z.object({ code: z.string() });

export function readWindowState(file: string): WindowState | undefined {
  try {
    return windowState.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch (error) {
    if (fileError.safeParse(error).data?.code !== 'ENOENT')
      console.error('Could not restore window bounds', error);

    return undefined;
  }
}

export function saveWindowState(file: string, state: WindowState): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(state));
    renameSync(temporary, file);
  } catch (error) {
    console.error('Could not save window bounds', error);
  }
}

// Keep the title bar reachable when a monitor was removed or its resolution changed.
export function windowBounds(
  saved: Rectangle | undefined,
  area: Rectangle,
): Rectangle {
  const width = Math.min(
    area.width,
    Math.max(minimumWidth, saved?.width ?? defaultWidth),
  );

  const height = Math.min(
    area.height,
    Math.max(minimumHeight, saved?.height ?? defaultHeight),
  );

  return {
    width,
    height,
    x: Math.max(
      area.x,
      Math.min(
        saved?.x ?? area.x + Math.round((area.width - width) / 2),
        area.x + area.width - width,
      ),
    ),
    y: Math.max(
      area.y,
      Math.min(
        saved?.y ?? area.y + Math.round((area.height - height) / 2),
        area.y + area.height - height,
      ),
    ),
  };
}
