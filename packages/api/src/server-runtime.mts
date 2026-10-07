import { homedir } from 'node:os';
import { join } from 'node:path';

// The Server and desktop share the ARGO_HOME boundary, including an empty override.
export const resolveRuntimeDirectory = () =>
  process.env.ARGO_HOME ?? join(homedir(), '.argo');
