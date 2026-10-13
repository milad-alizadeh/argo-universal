import { copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import type { InstallPorts, InstallToolInput } from '../src/agents';

const ports = createInstallationPorts();

const replaceNativeBin = async (input: InstallToolInput): Promise<void> => {
  const folder = join(input.cwd, 'node_modules', 'fixture-install');
  await copyFile('/bin/echo', join(folder, 'native-agent'));
  await writeFile(
    join(folder, 'package.json'),
    JSON.stringify({
      name: 'fixture-install',
      version: '1.2.3',
      bin: 'native-agent',
    }),
  );
};

export const nativeInstallationPorts: InstallPorts = {
  ...ports,
  runTool: async (input) => {
    const result = await ports.runTool(input);

    if (input.executable === 'npm') await replaceNativeBin(input);

    return result;
  },
};
