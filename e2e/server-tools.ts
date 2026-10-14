import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const toolStub = '#!/bin/sh\nexit 0\n';

// Puts a tool the Server finds on its PATH; it does nothing when run.
export async function placeTool(
  toolsPath: string,
  tool: string,
): Promise<void> {
  await writeFile(path.join(toolsPath, tool), toolStub, { mode: 0o755 });
}

// The Server finds Node.js (the test's own), npm and uv, so npx and uvx Agents offer Install.
export async function placeTools(toolsPath: string): Promise<void> {
  await mkdir(toolsPath, { recursive: true });
  await symlink(process.execPath, path.join(toolsPath, 'node'));

  for (const tool of ['npm', 'uv']) await placeTool(toolsPath, tool);
}
