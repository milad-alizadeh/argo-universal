import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { InstallPorts, InstallToolInput } from './ports';
import type { PortedInput as ProbeInput } from './types';

export const probeNode = async (
  input: ProbeInput,
  executable: string,
): Promise<string> => {
  const base = join(input.home, 'agents', 'registry', '.probes');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, '.probe-'));

  return runProbe(input.ports, probeTool(input, executable, directory));
};

const probeTool = (
  input: ProbeInput,
  executable: string,
  cwd: string,
): InstallToolInput => ({
  executable,
  args: ['--version'],
  cwd,
  env: { ...input.shellEnv },
  signal: input.signal,
});

const runProbe = async (
  ports: InstallPorts,
  tool: InstallToolInput,
): Promise<string> => {
  try {
    const version = await ports.runTool(tool);
    return version;
  } finally {
    await rm(tool.cwd, { recursive: true, force: true });
  }
};
