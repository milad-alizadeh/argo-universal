import { z } from 'zod';
import {
  PluginProjectInfo,
  PluginSessionInfo,
  SessionArchive,
  SessionGet,
} from './session-calls';

// The Plugin API's reads of Argo's Projects and Sessions; `sessions.get` needs `sessions:read` and `sessions.archive` needs `sessions:archive`.
export const sessionApiCalls = {
  projects: z
    .object({
      list: z.function({
        input: [],
        output: z.promise(z.array(PluginProjectInfo)),
      }),
    })
    .readonly(),
  sessions: z
    .object({
      get: z.function({
        input: [SessionGet.shape.sessionId],
        output: z.promise(PluginSessionInfo.nullable()),
      }),
      archive: z.function({
        input: [SessionArchive.shape.sessionId],
        output: z.promise(z.void()),
      }),
    })
    .readonly(),
};
