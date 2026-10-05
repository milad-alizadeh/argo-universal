import { claudeAdapter } from '../claude';

// Every Agent adapter the Server can start, the one place outside an adapter that names its vendor.
export const agentAdapters = [claudeAdapter] as const;
