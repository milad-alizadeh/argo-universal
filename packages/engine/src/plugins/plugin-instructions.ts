import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginInstruction } from '@repo/contracts/operations/control';
import { writeLog } from '@repo/machine-log';
import {
  locatePlugins,
  type LocateDeps,
  type LocatedPlugin,
} from './located-plugins';

// What reading Plugin instructions touches: the file read, and where a failure to read one is reported.
type InstructionIo = {
  readText: (path: string) => Promise<string>;
  report: (line: string) => void;
};

// A failure goes to the Plugins log, the channel Plugin failures already use; with no home there is no log to write.
const defaultIo = ({ home }: LocateDeps): InstructionIo => ({
  readText: (path) => readFile(path, 'utf8'),
  report: (line) => {
    if (home) writeLog({ home, label: 'plugins', line });
  },
});

// Plugin instructions are prose in a file beside the manifest, so core reads them while the Plugin's code stays unloaded.
export async function pluginInstructions(
  deps: LocateDeps,
  io: InstructionIo = defaultIo(deps),
): Promise<PluginInstruction[]> {
  const enabled = (await locatePlugins(deps)).filter(
    ({ plugin }) => plugin.enabled,
  );

  const read = await Promise.all(
    enabled.map((located) => instructionOf(located, io)),
  );

  return read.filter((found) => found !== undefined).toSorted(byPluginId);
}

const byPluginId = (a: PluginInstruction, b: PluginInstruction): number =>
  Number(a.pluginId > b.pluginId) - Number(a.pluginId < b.pluginId);

// A Plugin whose file cannot be read gives nothing, so it never takes the others' prose with it.
async function instructionOf(
  { plugin: { manifest }, directory }: LocatedPlugin,
  io: InstructionIo,
): Promise<PluginInstruction | undefined> {
  const { instructions } = manifest.contributes;

  if (instructions === undefined) return undefined;

  const text = (
    await readOrReport(manifest.id, join(directory, instructions), io)
  ).trim();

  return text
    ? { pluginId: manifest.id, name: manifest.name, text }
    : undefined;
}

const readOrReport = (
  pluginId: string,
  path: string,
  { readText, report }: InstructionIo,
): Promise<string> =>
  readText(path).catch((error: Error) => {
    report(`Plugin ${pluginId}: instructions unreadable: ${error.message}`);

    return '';
  });
