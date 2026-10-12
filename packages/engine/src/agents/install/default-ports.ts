import { downloadAgentArchive } from './download';
import type { InstallPorts } from './ports';
import { runInstallTool } from './process';
export const defaultInstallPorts: InstallPorts = {
  runTool: runInstallTool,
  download: downloadAgentArchive,
};
