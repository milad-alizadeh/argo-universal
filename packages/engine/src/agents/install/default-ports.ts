import { downloadAgentArchive } from './materialization/download';
import type { InstallPorts } from './ports';
import { runInstallTool } from './processes/process';
export const defaultInstallPorts: InstallPorts = {
  runTool: runInstallTool,
  download: downloadAgentArchive,
};
