import { z } from 'zod';
import { PluginProjectInfo, PluginSessionInfo, SessionGet } from './argo-calls';

// The Plugin API's reads of Argo's Projects and Sessions; `sessions.get` needs `sessions:read`.
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
    })
    .readonly(),
};
