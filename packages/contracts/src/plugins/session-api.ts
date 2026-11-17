import { z } from 'zod';
import {
  PluginProjectInfo,
  PluginPromptAnswer,
  PluginSessionInfo,
  PluginWithdrawAnswer,
  SessionArchive,
  SessionGet,
  SessionPrompt,
  SessionWithdraw,
} from './session-calls';

// The Plugin API's reads of Argo's Projects and Sessions; `sessions.get` needs `sessions:read` and `sessions.archive` needs `sessions:archive` and `sessions.prompt` and `sessions.withdraw` need `sessions:prompt`.
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
      prompt: z.function({
        input: [SessionPrompt.shape.sessionId, SessionPrompt.shape.text],
        output: z.promise(PluginPromptAnswer),
      }),
      // Takes back a Queued Prompt this Plugin sent; one that started, is gone or the person is editing stays.
      withdraw: z.function({
        input: [
          SessionWithdraw.shape.sessionId,
          SessionWithdraw.shape.queuedId,
        ],
        output: z.promise(PluginWithdrawAnswer),
      }),
      archive: z.function({
        input: [SessionArchive.shape.sessionId],
        output: z.promise(z.void()),
      }),
    })
    .readonly(),
};
