import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { z } from 'zod';
import { registrySchema, type Registry } from './model.mts';

export async function saveJson<T>(path: string, value: T): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${path}.tmp`, path);
}

export async function loadRegistry(path: string): Promise<Registry> {
  return registrySchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

export async function loadJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(JSON.parse(await readFile(path, 'utf8')));
}
