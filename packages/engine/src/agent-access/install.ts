import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  instructionTargets,
  optionalEntry,
  validateTargets,
} from './install-paths';
import { agentSkill, codexRule } from './instructions';

export interface InstallInstructionsInput {
  userHome: string;
  projectPaths: readonly string[];
}

export async function installAgentInstructions(
  input: InstallInstructionsInput,
): Promise<{ updated: boolean }> {
  const targets = instructionTargets(resolve(input.userHome));
  await validateTargets(input, targets);
  const existing = await Promise.all(targets.map(optionalEntry));
  await writeInstructions(targets);

  return { updated: existing.some(Boolean) };
}

async function writeInstructions(targets: string[]): Promise<void> {
  let written = 0;

  try {
    for (const path of targets) {
      await replaceFile(path, instructionContent(path));
      written += 1;
    }
  } catch (cause) {
    throw new Error(
      `Could not add Argo instructions: ${written} of 3 files updated. Run Add Argo to your Agents again to repair them.`,
      { cause },
    );
  }
}

async function replaceFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.argo-${randomUUID()}.tmp`);

  try {
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

function instructionContent(path: string): string {
  return path.endsWith('argo.rules') ? codexRule : agentSkill;
}
