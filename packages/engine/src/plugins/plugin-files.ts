import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';

export async function requirePluginFile(
  directory: string,
  path: string,
): Promise<string> {
  const [root, target] = await Promise.all([
    realpath(directory),
    realpath(path),
  ]);

  const relativePath = relative(root, target);

  if (isAbsolute(relativePath) || relativePath.split(sep).at(0) === '..')
    throw new Error('Plugin entry imports must stay in its folder');

  return target;
}
