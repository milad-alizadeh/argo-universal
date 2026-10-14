import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const toolStub = '#!/bin/sh\nexit 0\n';

// Puts a tool the Server finds on its PATH; it does nothing when run. It never writes over a file already there, so never through the link to the real Node.js.
export async function placeTool(
  toolsPath: string,
  tool: string,
): Promise<void> {
  await writeFile(path.join(toolsPath, tool), toolStub, {
    mode: 0o755,
    flag: 'wx',
  });
}

// Node.js (the test's own, linked) with npm, as installing Node.js outside Argo leaves them.
export async function placeNode(toolsPath: string): Promise<void> {
  await symlink(process.execPath, path.join(toolsPath, 'node'));
  await placeTool(toolsPath, 'npm');
}

// The Server finds Node.js, npm and uv, so npx and uvx Agents offer Install.
export async function placeTools(toolsPath: string): Promise<void> {
  await mkdir(toolsPath, { recursive: true });
  await placeNode(toolsPath);
  await placeTool(toolsPath, 'uv');
}
