import path from 'node:path';

// The Agents append the ACP requests e2e steps check here, one JSON line each.
export const requestLogName = 'agent-requests.jsonl';

// initTestRepository makes the Server's one Project here.
export const projectDirectoryName = 'project';

type ServerFiles = { projectPath: string; requestLogPath: string };

export const serverFiles = (directory: string): ServerFiles => ({
  projectPath: path.join(directory, projectDirectoryName),
  requestLogPath: path.join(directory, requestLogName),
});
